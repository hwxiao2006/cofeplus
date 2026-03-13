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

test('移动端应提供快捷筛选栏与筛选底部弹层', () => {
  assert.ok(/class="mobile-filter-bar"/.test(html));
  assert.ok(/id="mobileFilterSheet"/.test(html));
  assert.ok(/筛选条件/.test(html));
  assert.ok(/应用筛选/.test(html));
});

test('移动端订单应改为订单流卡片并保留订单级动作', () => {
  assert.ok(/mobile-order-stream-card/.test(html));
  assert.ok(/class="mobile-card-amount"/.test(html));
  assert.ok(/退款/.test(html));
  assert.ok(/返券/.test(html));
  assert.ok(/详情/.test(html));
});

test('移动端指标卡应改为一屏一张的左右滑动布局', () => {
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.metrics-grid\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow-x:\s*auto;[\s\S]*scroll-snap-type:\s*x\s+mandatory;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.metric-card\s*\{[\s\S]*flex:\s*0\s+0\s+100%;[\s\S]*min-width:\s*100%;[\s\S]*max-width:\s*100%;/.test(html));
});

test('430px 及以下移动端应切换为紧凑单列卡片布局以避免横向滚动', () => {
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.content\s*\{[\s\S]*padding:\s*6px\s+10px\s+96px;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-card-top\s*\{[\s\S]*flex-direction:\s*column;[\s\S]*gap:\s*10px;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-card-status\s*\{[\s\S]*width:\s*100%;[\s\S]*flex-direction:\s*row;[\s\S]*justify-content:\s*space-between;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-id\s*\{[\s\S]*white-space:\s*normal;[\s\S]*word-break:\s*break-all;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-meta-grid\s*\{[\s\S]*grid-template-columns:\s*1fr;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-meta-card:last-child\s*\{[\s\S]*grid-column:\s*auto;/.test(html));
});
