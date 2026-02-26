const assert = require('assert');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'product-detail.html');
const html = fs.readFileSync(filePath, 'utf8');

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

test('商品编辑表单应包含币种输入项', () => {
  assert.ok(html.includes('id="productCurrency"'));
});

test('商品编辑表单应包含原价输入项', () => {
  assert.ok(html.includes('id="productOriginalPrice"'));
});

test('商品编辑表单应支持本地图片上传', () => {
  assert.ok(html.includes('id="productImageFile"'));
  assert.ok(/function\s+handleProductImageFileChange\s*\(/.test(html));
  assert.ok(html.includes('readAsDataURL'));
});

test('商品编辑表单不应包含税费与税率输入项', () => {
  assert.ok(!html.includes('id="productTaxEnabled"'));
  assert.ok(!html.includes('id="productTaxRate"'));
});

test('saveProduct 应持久化 currency 字段', () => {
  assert.ok(/currency:\s*currency/.test(html));
});

test('saveProduct 应持久化 originalPrice 字段', () => {
  assert.ok(/originalPrice:\s*originalPrice/.test(html));
});

test('返回菜单页应默认定位到菜单管理内层tab', () => {
  assert.ok(/menu-management\.html\?tab=menu&innerTab=manage/.test(html));
});

test('详情页应支持通过 payloadKey 从会话存储读取数据', () => {
  assert.ok(/const\s+payloadKey\s*=\s*params\.get\('payloadKey'\)/.test(html));
  assert.ok(/sessionStorage\.getItem\(`productDetailPayload:\$\{payloadKey\}`\)/.test(html));
});
