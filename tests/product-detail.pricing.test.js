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

test('详情页应支持通过 window.name 读取大图商品数据', () => {
  assert.ok(/const\s+payloadStore\s*=\s*params\.get\('payloadStore'\)/.test(html));
  assert.ok(/payloadStore === 'windowName'/.test(html));
  assert.ok(/window\.name/.test(html));
  assert.ok(/__type === 'productDetailPayload'/.test(html));
});

test('详情页在缺少 payload 时应支持按商品ID读取本地编辑数据', () => {
  assert.ok(/const\s+productId\s*=\s*Number\(params\.get\('id'\)\)/.test(html));
  assert.ok(/localStorage\.getItem\('menuProductEdits'\)/.test(html));
  assert.ok(/edits && edits\[productId\]/.test(html));
});

test('详情页应将基本信息与配方配置拆分为分页签', () => {
  assert.ok(html.includes('id="productDetailTabBasicBtn"'));
  assert.ok(html.includes('id="productDetailTabRecipeBtn"'));
  assert.ok(html.includes('id="productDetailBasicPanel"'));
  assert.ok(html.includes('id="productDetailRecipePanel"'));
  assert.ok(/function\s+switchProductDetailTab\s*\(/.test(html));
  assert.ok(/switchProductDetailTab\('basic'\)/.test(html));
});

test('详情页应支持按选项修改配方，并可调整分组顺序和百分比', () => {
  const editBtnCount = (html.match(/>修改配方</g) || []).length;
  assert.strictEqual(editBtnCount, 1);
  assert.ok(html.includes('id="openRecipeEditorBtn"'));
  assert.ok(/function\s+openRecipeEditorForActiveSpec\s*\(/.test(html));
  assert.ok(html.includes('id="recipeEditorModal"'));
  assert.ok(html.includes('id="recipeImpactModal"'));
  assert.ok(/function\s+openRecipeEditor\s*\(/.test(html));
  assert.ok(/function\s+openRecipeImpactModal\s*\(/.test(html));
  assert.ok(/function\s+confirmRecipeImpactApply\s*\(/.test(html));
  assert.ok(/function\s+moveRecipeGroup\s*\(/.test(html));
  assert.ok(/function\s+adjustRecipeGroupPercent\s*\(/.test(html));
  assert.ok(html.includes('-10%'));
  assert.ok(html.includes('+10%'));
  assert.ok(!/function\s+updateRecipeGroupNames\s*\(/.test(html));
  assert.ok(!html.includes('recipe-group-input'));
  assert.ok(html.includes('基底咖啡液'));
  assert.ok(html.includes('浓缩粉名称'));
  assert.ok(html.includes('装饰颗粒名称'));
});

test('影响商品列表不应包含当前商品', () => {
  assert.ok(/if\s*\(productData\s*&&\s*Number\(productData\.id\)\s*===\s*id\)\s*return\s+null;/.test(html));
  assert.ok(/当前商品会直接更新/.test(html));
});

test('保存商品应持久化 recipe 关联字段', () => {
  assert.ok(/optionRecipes:\s*productData\.optionRecipes\s*\|\|\s*\{\}/.test(html));
  assert.ok(/optionRecipeLinks:\s*productData\.optionRecipeLinks\s*\|\|\s*\{\}/.test(html));
});
