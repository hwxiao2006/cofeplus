const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

const html = fs.readFileSync(path.join(__dirname, '..', 'materials.html'), 'utf8');
const materialsOrdersHtml = fs.readFileSync(path.join(__dirname, '..', 'materials-orders.html'), 'utf8');
const materialsRefillHtml = fs.readFileSync(path.join(__dirname, '..', 'materials-refill.html'), 'utf8');

test('物料页：应支持从 URL device 参数恢复设备', () => {
  assert.ok(/new URLSearchParams\(window\.location\.search \|\| ''\)/.test(html));
  assert.ok(/params\.get\('device'\)/.test(html));
  assert.ok(/currentDevice = resolveInitialDevice\(\)/.test(html));
});

test('物料页：设备来源不在默认列表时应加入下拉选项', () => {
  assert.ok(/if \(!allDeviceOptions\.includes\(currentDevice\)\)/.test(html));
  assert.ok(/allDeviceOptions\.unshift\(currentDevice\)/.test(html));
});

test('物料页：发货清单入口应跳转到运维清单页面', () => {
  assert.ok(/function goToOrdersList\(\)\s*\{[\s\S]*window\.location\.href = '\/materials-orders\.html\?from=materials';/.test(html));
});

test('运维清单页面：标题与标签应为运维清单视图，而不是订单页', () => {
  assert.ok(/<h1 class="header-title">运维清单<\/h1>/.test(materialsOrdersHtml));
  assert.ok(materialsOrdersHtml.includes('我的清单'));
  assert.ok(materialsOrdersHtml.includes('待处理'));
  assert.ok(materialsOrdersHtml.includes('历史清单'));
  assert.ok(!materialsOrdersHtml.includes('订单管理 - 运营控制台'));
  assert.ok(!materialsOrdersHtml.includes('<h1 class="header-title">订单</h1>'));
});

test('补充物料页：提交后应返回运维清单页面入口', () => {
  assert.ok(materialsRefillHtml.includes("window.location.href = '/materials-orders.html?from=materials';"));
});

test('补充物料页：来自卡片补充时应默认定位到对应物料', () => {
  assert.ok(/data-material-code="\$\{item\.code\}"/.test(materialsRefillHtml));
});

test('补充物料页：列表仅展开当前分类，其他分类默认收起', () => {
  assert.ok(/const\s+activeList\s*=\s*materialsData\[currentCategory\]\s*\|\|\s*\[\];/.test(materialsRefillHtml));
  const renderMatch = materialsRefillHtml.match(/function\s+renderMaterials\s*\(\)\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(renderMatch && renderMatch[1], '未找到 renderMaterials 函数');
  assert.ok(!/Object\.keys\(materialsData\)\.forEach\(/.test(renderMatch[1]));
});

test('补充物料页：已添加物料应有独立颜色态，并跟随数量变化', () => {
  assert.ok(/\.material-item\.selected\s*\{/.test(materialsRefillHtml));
  assert.ok(/\$\{qty > 0 \? 'selected' : ''\}/.test(materialsRefillHtml));
  assert.ok(/row\.classList\.toggle\('selected',\s*validQty > 0\)/.test(materialsRefillHtml));
});

test('补充物料页：预选物料应聚焦到物料行', () => {
  assert.ok(/tabindex="-1"/.test(materialsRefillHtml));
  assert.ok(/row\.focus\(\{\s*preventScroll:\s*true\s*\}\)/.test(materialsRefillHtml));
});

test('补充物料页：配送时间应按固定天数选项选择', () => {
  assert.ok(materialsRefillHtml.includes('id="deliveryDateOption"'));
  assert.ok(/const\s+DELIVERY_DAY_OFFSETS\s*=\s*\[\s*1,\s*3,\s*5,\s*8,\s*10,\s*12\s*\];/.test(materialsRefillHtml));
  assert.ok(/function\s+populateDeliveryDateOptions\s*\(\)/.test(materialsRefillHtml));
  assert.ok(/document\.getElementById\('deliveryDateOption'\)/.test(materialsRefillHtml));
});

test('补充物料页：确认生成时应使用配送日期选项构造时间', () => {
  assert.ok(/const\s+deliveryDateValue\s*=\s*document\.getElementById\('deliveryDateOption'\)\.value;/.test(materialsRefillHtml));
  assert.ok(/const\s+deliveryDateObj\s*=\s*new Date\(year,\s*month - 1,\s*day,\s*9,\s*0,\s*0\);/.test(materialsRefillHtml));
  assert.ok(/const\s+deliveryTime\s*=\s*deliveryDateObj\.toISOString\(\);/.test(materialsRefillHtml));
});

test('运维清单页面：应提供桌面端优化布局', () => {
  assert.ok(/@media\s*\(min-width:\s*1200px\)/.test(materialsOrdersHtml));
  assert.ok(/\.desktop-table-head\s*\{[\s\S]*grid-template-columns:\s*1\.1fr 1fr 1fr \.8fr 2fr \.7fr 1\.2fr \.9fr;/.test(materialsOrdersHtml));
  assert.ok(/\.order-desktop-row\s*\{[\s\S]*grid-template-columns:\s*1\.1fr 1fr 1fr \.8fr 2fr \.7fr 1\.2fr \.9fr;/.test(materialsOrdersHtml));
  assert.ok(/list\.innerHTML\s*=\s*`\s*<div class="desktop-table-head">/.test(materialsOrdersHtml));
  assert.ok(/<div class="order-desktop-row">/.test(materialsOrdersHtml));
  assert.ok(/\.order-mobile-block\s*\{[\s\S]*display:\s*none;/.test(materialsOrdersHtml));
});
