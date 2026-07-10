const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const menuHtml = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  const parenStart = start + signature.length - 1;
  let parenDepth = 0;
  let parenEnd = -1;
  for (let index = parenStart; index < source.length; index += 1) {
    if (source[index] === '(') parenDepth += 1;
    if (source[index] === ')') parenDepth -= 1;
    if (parenDepth === 0) {
      parenEnd = index;
      break;
    }
  }
  if (parenEnd === -1) {
    throw new Error(`函数 ${functionName} 参数解析失败`);
  }
  const bodyStart = source.indexOf('{', parenEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function buildSandbox() {
  const sandbox = { console };
  vm.createContext(sandbox);
  // 依赖的常量与轻量替身：label/desc/extraPrice 的取数逻辑不在本测试范围
  vm.runInContext(`
    const ORDER_PREVIEW_OPTION_LIBRARY = {};
    const ORDER_PREVIEW_OPTION_TITLE_MAP = {};
    function getOrderPreviewOptionLabel(product, specKey, key) { return key; }
    function getOrderPreviewOptionDesc() { return ''; }
    function getOrderPreviewOptionExtraPrice(product, specKey, key) {
      const value = Number(product?.tagExtraPrices?.[specKey]?.[key]);
      return Number.isFinite(value) ? value : 0;
    }
    function resolveOrderPreviewOptionKey(product, specKey, value) {
      if (!value) return '';
      const keys = Object.keys(product?.tagI18n?.[specKey] || {});
      return keys.includes(value) ? value : '';
    }
  `, sandbox);
  [
    'getOrderPreviewOptionStatus',
    'getOrderPreviewOptionItems',
    'getOrderPreviewPreferredOptionCandidate',
    'getOrderPreviewPreferredOptionKey'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(menuHtml, functionName), sandbox);
  });
  return sandbox;
}

const sandbox = buildSandbox();

function buildProduct() {
  return {
    tagI18n: {
      syrup: {
        蔗糖糖浆: { zh: '蔗糖糖浆' },
        香草糖浆: { zh: '香草糖浆' },
        榛果糖浆: { zh: '榛果糖浆' }
      }
    },
    tagExtraPrices: { syrup: { 香草糖浆: 2 } },
    defaultOptions: { syrup: '蔗糖糖浆' },
    tagOptionStatus: {
      syrup: { 香草糖浆: 'hidden', 榛果糖浆: 'disabled' }
    }
  };
}

test('点单屏预览：隐藏选项被过滤，不可用选项带 disabled 标记', () => {
  const items = sandbox.getOrderPreviewOptionItems(buildProduct(), 'syrup', 'zh');
  const keys = items.map((item) => item.key);
  assert.ok(!keys.includes('香草糖浆'), 'hidden 选项不应出现在点单屏');
  assert.ok(keys.includes('蔗糖糖浆') && keys.includes('榛果糖浆'), '正常与不可用选项都应保留');
  const disabledItem = items.find((item) => item.key === '榛果糖浆');
  assert.strictEqual(disabledItem.disabled, true, 'disabled 选项应带禁点标记');
  const activeItem = items.find((item) => item.key === '蔗糖糖浆');
  assert.strictEqual(activeItem.disabled, false);
});

test('点单屏预览：无状态数据时行为不变（全部可点）', () => {
  const product = buildProduct();
  delete product.tagOptionStatus;
  const items = sandbox.getOrderPreviewOptionItems(product, 'syrup', 'zh');
  assert.strictEqual(items.length, 3);
  assert.ok(items.every((item) => item.disabled === false));
});

test('点单屏预览：默认选项被隐藏时降级到第一个可点选项', () => {
  const product = buildProduct();
  product.defaultOptions.syrup = '香草糖浆'; // 已 hidden
  const preferred = sandbox.getOrderPreviewPreferredOptionKey(product, 'syrup', 'zh');
  assert.strictEqual(preferred, '蔗糖糖浆', '应跳过 hidden 的默认与 disabled 项，取第一个可点项');
});

test('点单屏预览：默认选项不可用时同样降级', () => {
  const product = buildProduct();
  product.defaultOptions.syrup = '榛果糖浆'; // disabled
  const preferred = sandbox.getOrderPreviewPreferredOptionKey(product, 'syrup', 'zh');
  assert.strictEqual(preferred, '蔗糖糖浆');
});

test('点单屏预览：渲染器为 disabled 选项输出禁点按钮（静态断言）', () => {
  assert.ok(/order-preview-detail-option-btn[^`]*is-disabled/.test(menuHtml), '普通选项按钮应有 is-disabled class 分支');
  assert.ok(/order-preview-detail-bean-btn[^`]*is-disabled/.test(menuHtml), '咖啡豆按钮应有 is-disabled class 分支');
  assert.ok(/\.order-preview-detail-option-btn\.is-disabled/.test(menuHtml), '应有 is-disabled 样式');
  assert.ok(menuHtml.includes("${item.disabled ? 'disabled' : ''}"), '按钮应输出原生 disabled 属性');
});
