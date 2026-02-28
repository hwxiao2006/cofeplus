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

test('订单页应提供截图中的六个搜索维度选项', () => {
  assert.ok(/id="orderSearchFieldDesktop"/.test(html));
  assert.ok(/id="orderSearchFieldDesktop"[\s\S]*<option value="orderId" selected>订单号<\/option>/.test(html));
  assert.ok(/name="orderSearchField"\s+value="orderId"/.test(html));
  assert.ok(/name="orderSearchField"\s+value="nickname"/.test(html));
  assert.ok(/name="orderSearchField"\s+value="phone"/.test(html));
  assert.ok(/name="orderSearchField"\s+value="productName"/.test(html));
  assert.ok(/name="orderSearchField"\s+value="transactionId"/.test(html));
  assert.ok(/name="orderSearchField"\s+value="deviceId"/.test(html));
});

test('筛选逻辑应根据桌面下拉或移动端单选框获取搜索维度', () => {
  assert.ok(/function\s+getSelectedOrderSearchField\(\)/.test(html));
  assert.ok(/const\s+desktopSelect\s*=\s*document\.getElementById\('orderSearchFieldDesktop'\)/.test(html));
  assert.ok(/window\.matchMedia\('\(max-width:\s*1024px\)'\)\.matches/.test(html));
  assert.ok(/const\s+searchField\s*=\s*getSelectedOrderSearchField\(\)/.test(html));
  assert.ok(/switch\s*\(searchField\)/.test(html));
  assert.ok(/case\s*'nickname'/.test(html));
  assert.ok(/case\s*'phone'/.test(html));
  assert.ok(/case\s*'productName'/.test(html));
  assert.ok(/case\s*'transactionId'/.test(html));
  assert.ok(/case\s*'deviceId'/.test(html));
});

test('订单 mock 数据应包含昵称手机号交易单号用于预览搜索', () => {
  assert.ok(/nickname\s*:\s*'/.test(html));
  assert.ok(/phone\s*:\s*'1\d{10}'/.test(html));
  assert.ok(/transactionId\s*:\s*'TXN/.test(html));
});
