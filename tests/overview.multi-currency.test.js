const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'overview.html'), 'utf8');

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

test('总览页应读取基础设置中的币种并支持多币种格式化', () => {
  assert.ok(/const\s+MENU_BASIC_SETTINGS_KEY\s*=\s*'menuBasicSettings'/.test(html));
  assert.ok(/const\s+SUPPORTED_CURRENCIES\s*=\s*\{[\s\S]*CNY[\s\S]*USD[\s\S]*EUR[\s\S]*HKD[\s\S]*JPY[\s\S]*\}/.test(html));
  assert.ok(/function\s+loadOverviewCurrency\(\)/.test(html));
  assert.ok(/overviewCurrency\s*=\s*normalizeOverviewCurrency\(parsed\.currency\)/.test(html));
  assert.ok(/function\s+formatMoneyByCurrency\(amount,\s*currency\)/.test(html));
  assert.ok(/function\s+formatCurrency\(amount\)\s*\{\s*return\s+formatMoneyByCurrency\(amount,\s*overviewCurrency\);/.test(html));
  assert.ok(/function\s+updateProductPriceLabel\(\)/.test(html));
  assert.ok(/id="productPriceLabel"/.test(html));
});

test('总览页金额展示应使用币种格式化而非固定人民币符号', () => {
  assert.ok(/document\.getElementById\('ovGrossSales'\)\.textContent\s*=\s*formatCurrency\(0\)/.test(html));
  assert.ok(/document\.getElementById\('ovNetSales'\)\.textContent\s*=\s*formatCurrency\(0\)/.test(html));
  assert.ok(/document\.getElementById\('ovAvgSales'\)\.textContent\s*=\s*formatCurrency\(0\)/.test(html));
  assert.ok(/title=\"\$\{hour\}:00 \$\{formatCurrency\(hourValues\[idx\]\)\}\"/.test(html));
  assert.ok(/<div class="product-price">\$\{formatMoneyByCurrency\(p\.price,\s*getMenuDisplayCurrency\(\)\)\}<\/div>/.test(html));
});

test('总览页应在页面存活期间动态跟随商品管理币种配置变化', () => {
  assert.ok(/function\s+syncOverviewCurrency\(\)\s*\{/.test(html));
  assert.ok(/const\s+currencyChanged\s*=\s*loadOverviewCurrency\(\);/.test(html));
  assert.ok(/if\s*\(currencyChanged\)\s*\{\s*updateProductPriceLabel\(\);/.test(html));
  assert.ok(/function\s+renderOverview\(\)\s*\{\s*syncOverviewCurrency\(\);/.test(html));
  assert.ok(/function\s+renderMenu\(\)\s*\{\s*syncOverviewCurrency\(\);/.test(html));
  assert.ok(/window\.addEventListener\('storage',\s*function\s*\(event\)\s*\{[\s\S]*MENU_BASIC_SETTINGS_KEY/.test(html));
  assert.ok(/window\.addEventListener\('focus',\s*function\s*\(\)\s*\{/.test(html));
});
