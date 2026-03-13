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

function extractDesktopFilterRow(className, nextMarker) {
  const pattern = new RegExp(`<div class="${className}">([\\s\\S]*?)${nextMarker}`);
  const match = html.match(pattern);
  return match ? match[1] : '';
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

test('订单页桌面端应将搜索维度放在首行并在高级区保留应用按钮', () => {
  const primaryRow = extractDesktopFilterRow('control-panel-primary', '<div class="control-panel-secondary" id="advancedFilters">');
  const secondaryRow = extractDesktopFilterRow('control-panel-secondary" id="advancedFilters', '</section>');
  assert.ok(
    /id="statusFilter"[\s\S]*id="deviceFilterTrigger"[\s\S]*id="advancedFilterBtn"/.test(primaryRow),
    'desktop primary row should contain status, device, and advanced toggle'
  );
  assert.ok(
    !/id="orderSearchFieldDesktop"/.test(primaryRow),
    'desktop primary row should no longer contain the search field selector'
  );
  assert.ok(
    !/id="orderSearch"/.test(primaryRow),
    'desktop primary row should no longer contain the keyword input'
  );
  assert.ok(
    /id="orderSearchFieldDesktop"[\s\S]*id="orderSearch"[\s\S]*id="startDate"[\s\S]*应用筛选/.test(secondaryRow),
    'desktop advanced row should include search dimension, keyword, date range, and apply button'
  );
});

test('订单页日期筛选应统一为按天选择', () => {
  assert.ok(/<input type="date" class="date-input" id="startDate"/.test(html), 'desktop start date should use type=date');
  assert.ok(/<input type="date" class="date-input" id="endDate"/.test(html), 'desktop end date should use type=date');
  assert.ok(/<input type="date" class="date-input" id="mobileStartDate"/.test(html), 'mobile start date should use type=date');
  assert.ok(/<input type="date" class="date-input" id="mobileEndDate"/.test(html), 'mobile end date should use type=date');
  assert.ok(!/datetime-local/.test(html), 'orders page should not use datetime-local date inputs');
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

test('订单页设备筛选应支持按设备编号和点位名称搜索', () => {
  assert.ok(/id="deviceFilterSearch"[\s\S]*placeholder="搜索设备编号或点位名称/.test(html), 'desktop device search placeholder should mention location names');
  assert.ok(/id="mobileDeviceFilterSearch"[\s\S]*placeholder="搜索设备编号或点位名称/.test(html), 'mobile device search placeholder should mention location names');
  assert.ok(/function\s+getDeviceFilterCandidates\(keyword = ''\)/.test(html), 'missing device filter candidates helper');
  assert.ok(/const candidates = \[option\.id,\s*option\.locationName,\s*formatDeviceFilterLabel\(option\)\]/.test(html), 'device filter candidates should include device id and location name');
  assert.ok(/return candidates\.some\(value => String\(value \|\| ''\)\.toLowerCase\(\)\.includes\(normalizedKeyword\)\)/.test(html), 'device filter keyword matching should search across all candidates');
});

test('订单页日期筛选逻辑应在应用时按天过滤订单', () => {
  assert.ok(/function\s+applyFilters\(\)/.test(html), 'missing desktop apply helper');
  assert.ok(/function\s+applyMobileFilters\(\)\s*\{[\s\S]*filterOrders\(\);[\s\S]*closeMobileFilterSheet\(\);[\s\S]*\}/.test(html), 'mobile apply should trigger filtering before closing');
  assert.ok(/const\s+startDateValue\s*=\s*document\.getElementById\('startDate'\)\.value/.test(html), 'filterOrders should read start date');
  assert.ok(/const\s+endDateValue\s*=\s*document\.getElementById\('endDate'\)\.value/.test(html), 'filterOrders should read end date');
  assert.ok(/function\s+normalizeOrderDateValue\(value\)/.test(html), 'missing date normalization helper');
  assert.ok(/if\s*\(startDateValue[\s\S]*orderDateValue\s*<\s*startDateValue/.test(html), 'filterOrders should reject rows before the selected start date');
  assert.ok(/if\s*\(endDateValue[\s\S]*orderDateValue\s*>\s*endDateValue/.test(html), 'filterOrders should reject rows after the selected end date');
});

test('订单页应通过 fallback 订单构建函数补齐昵称手机号交易单号搜索字段', () => {
  assert.ok(/function\s+buildFallbackOrderRecord\s*\(/.test(html));
  assert.ok(/nickname:\s*buildFallbackOrderNickname\(/.test(html));
  assert.ok(/phone:\s*buildFallbackOrderPhone\(/.test(html));
  assert.ok(/transactionId:\s*buildFallbackTransactionId\(/.test(html));
});
