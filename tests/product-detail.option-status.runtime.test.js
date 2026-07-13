const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const productHtml = fs.readFileSync(path.join(__dirname, '..', 'product-detail.html'), 'utf8');

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
  // 先匹配完参数列表的括号（参数可能是解构 { ... }），再找函数体的 {
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
  vm.runInContext("const TAG_OPTION_STATUSES = ['active', 'disabled', 'hidden'];", sandbox);
  [
    'normalizeTagOptionStatus',
    'getTagOptionStatus',
    'resolveOptionStatusChange'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(productHtml, functionName), sandbox);
  });
  // getTagOptionStatus 的默认参数引用页面全局 productData，vm 里补一个空对象
  vm.runInContext('var productData = {};', sandbox);
  return sandbox;
}

const sandbox = buildSandbox();

test('选项状态：缺省与非法值一律归一为 active', () => {
  assert.strictEqual(sandbox.normalizeTagOptionStatus(undefined), 'active');
  assert.strictEqual(sandbox.normalizeTagOptionStatus('bogus'), 'active');
  assert.strictEqual(sandbox.normalizeTagOptionStatus('disabled'), 'disabled');
  assert.strictEqual(sandbox.normalizeTagOptionStatus('hidden'), 'hidden');

  const product = { tagOptionStatus: { syrup: { 香草糖浆: 'hidden' } } };
  assert.strictEqual(sandbox.getTagOptionStatus('syrup', '香草糖浆', product), 'hidden');
  assert.strictEqual(sandbox.getTagOptionStatus('syrup', '蔗糖糖浆', product), 'active');
  assert.strictEqual(sandbox.getTagOptionStatus('sweetness', '无糖', product), 'active');
});

test('选项状态：停用非默认项不迁移默认', () => {
  const result = sandbox.resolveOptionStatusChange({
    tagKeys: ['蔗糖糖浆', '香草糖浆', '榛果糖浆'],
    statusMap: {},
    targetKey: '香草糖浆',
    nextStatus: 'disabled',
    selectedKey: '蔗糖糖浆'
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.needsMigration, false);
  assert.strictEqual(result.statusMap['香草糖浆'], 'disabled');
  assert.strictEqual(result.statusMap['蔗糖糖浆'], 'active');
});

test('选项状态：隐藏当前默认项时迁移到第一个正常选项', () => {
  const result = sandbox.resolveOptionStatusChange({
    tagKeys: ['蔗糖糖浆', '香草糖浆', '榛果糖浆'],
    statusMap: { 香草糖浆: 'disabled' },
    targetKey: '蔗糖糖浆',
    nextStatus: 'hidden',
    selectedKey: '蔗糖糖浆'
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.needsMigration, true);
  assert.strictEqual(result.migrateTo, '榛果糖浆', '香草糖浆已停用，应跳到榛果糖浆');
});

test('选项状态：最后一个正常选项不允许被停用或隐藏', () => {
  ['disabled', 'hidden'].forEach((nextStatus) => {
    const result = sandbox.resolveOptionStatusChange({
      tagKeys: ['热', '标准冰'],
      statusMap: { 标准冰: 'hidden' },
      targetKey: '热',
      nextStatus,
      selectedKey: '热'
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'last_active');
  });
});

test('选项状态：恢复为 active 永远允许，且不触发迁移', () => {
  const result = sandbox.resolveOptionStatusChange({
    tagKeys: ['热', '标准冰'],
    statusMap: { 标准冰: 'hidden' },
    targetKey: '标准冰',
    nextStatus: 'active',
    selectedKey: '热'
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.needsMigration, false);
  assert.strictEqual(result.statusMap['标准冰'], 'active');
});

test('选项状态：数据模型与保存链路（静态断言）', () => {
  assert.ok(productHtml.includes('tagOptionStatus: productData.tagOptionStatus || {}'), '保存草稿应携带 tagOptionStatus');
  assert.ok(productHtml.includes('id="tagStatusMenu"'), '应有点击标签弹出的状态菜单元素');
  assert.ok(productHtml.includes('id="tagStatusMenuBackdrop"'), '移动端底部面板应有遮罩');
  assert.ok(productHtml.includes('点单屏展示状态'), '状态菜单应有标题');
  assert.ok(productHtml.includes('handleTagStatusMenuPick'), '菜单项应接立即生效的处理函数');
  assert.ok(/function\s+selectDrawerTag\([\s\S]*?openTagStatusMenu\(/.test(productHtml), '点击标签 chip 应同时弹出状态菜单');
  assert.ok(productHtml.includes('isMobileViewport'), '应按视口区分桌面浮层与移动端底部面板');
  assert.ok(/tag-status-menu\.sheet/.test(productHtml), '移动端应有底部动作面板样式');
  assert.ok(/existing-tag-item\[data-status="disabled"\]/.test(productHtml), '标签 chip 应有不可用状态徽标样式');
  assert.ok(/existing-tag-item\[data-status="hidden"\]/.test(productHtml), '标签 chip 应有隐藏状态徽标样式');
  assert.ok(productHtml.includes('每组至少保留一个正常选项'), '最后一个正常选项被停时应有提示');
  assert.ok(!productHtml.includes('optionStatusMenu'), '旧选项 chip 网格的浮层菜单应已移除');
  assert.ok(!productHtml.includes('name="drawerTagStatus"'), '编辑器内嵌 radio 已被 chip 点击菜单取代');
});
