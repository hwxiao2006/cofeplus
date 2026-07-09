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

test('订单工具栏应提供下载订单按钮', () => {
  assert.ok(/class="btn-download-orders" id="downloadOrdersBtn" onclick="downloadFilteredOrders\(\)"/.test(html));
  assert.ok(/>下载订单<\/button>/.test(html));
});

test('订单页应声明 CSV 导出相关函数', () => {
  assert.ok(/function\s+escapeCsvField\s*\(/.test(html));
  assert.ok(/function\s+buildOrdersCsv\s*\(/.test(html));
  assert.ok(/function\s+downloadFilteredOrders\s*\(/.test(html));
});

test('CSV 导出应包含与表格一致的表头与标准格式约定', () => {
  assert.ok(/'点位', '商品', '时间', '设备', '取货码', '订单号', '状态', '金额'/.test(html));
  assert.ok(/\\ufeff/.test(html), 'CSV blob should prepend UTF-8 BOM');
  assert.ok(/text\/csv;charset=utf-8/.test(html));
  assert.ok(/orders-export-\$\{dateText\}\.csv/.test(html));
  assert.ok(/\\r\\n/.test(html), 'CSV rows should join with CRLF');
});

test('筛选结果为空时应提示且不触发下载', () => {
  assert.ok(/当前筛选条件下暂无订单可下载/.test(html));
});

test('下载按钮应有桌面与移动端样式', () => {
  assert.ok(/\.btn-download-orders\s*\{[^}]*height:\s*40px/.test(html));
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.btn-download-orders\s*\{[^}]*width:\s*100%/.test(html));
});
