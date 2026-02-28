const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadMenuContext() {
  const htmlPath = path.join(__dirname, '..', 'menu-management.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) {
    throw new Error('menu-management.html 中未找到脚本代码');
  }

  let script = match[1]
    .replace('let deviceConfig = {', 'globalThis.deviceConfig = {')
    .replace('let productsData = {', 'globalThis.productsData = {')
    .replace("let currentDevice = 'RCK111';", "globalThis.currentDevice = 'RCK111';")
    .replace("let currentLang = 'zh';", "globalThis.currentLang = 'zh';")
    .replace("let platformLang = 'zh';", "globalThis.platformLang = 'zh';")
    .replace('let nextProductId = 14;', 'globalThis.nextProductId = 14;')
    .replace("let selectedCategoryIcon = '☕';", "globalThis.selectedCategoryIcon = '☕';")
    .replace('let editingProductId = null;', 'globalThis.editingProductId = null;')
    .replace("let editingProductCategory = '';", "globalThis.editingProductCategory = '';")
    .replace('let allDeviceOptions = [];', 'globalThis.allDeviceOptions = [];')
    .replace('let overviewAllDevices = [];', 'globalThis.overviewAllDevices = [];')
    .replace('let overviewSelectedDevices = new Set();', 'globalThis.overviewSelectedDevices = new Set();')
    .replace("let currentTab = 'menu';", "globalThis.currentTab = 'menu';");

  const elements = {};
  function getElement(id) {
    if (!elements[id]) {
      const classNames = new Set();
      elements[id] = {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        dataset: {},
        classList: {
          add(name) { classNames.add(name); },
          remove(name) { classNames.delete(name); },
          toggle(name, force) {
            if (typeof force === 'boolean') {
              if (force) classNames.add(name);
              else classNames.delete(name);
              return force;
            }
            if (classNames.has(name)) {
              classNames.delete(name);
              return false;
            }
            classNames.add(name);
            return true;
          },
          contains(name) { return classNames.has(name); }
        }
      };
    }
    return elements[id];
  }

  const storage = {};
  const localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    }
  };

  const session = {};
  const sessionStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(session, key) ? session[key] : null;
    },
    setItem(key, value) {
      session[key] = String(value);
    },
    removeItem(key) {
      delete session[key];
    }
  };

  const context = {
    console,
    window: { location: { pathname: '/menu-management.html', search: '', href: '' }, history: { replaceState() {} } },
    localStorage,
    sessionStorage,
    document: {
      addEventListener() {},
      getElementById: getElement,
      querySelector() { return getElement('q'); },
      querySelectorAll() { return { forEach() {} }; }
    },
    confirm() { return true; },
    prompt() { return null; },
    setTimeout() {},
    clearTimeout() {},
    encodeURIComponent,
    URLSearchParams,
    JSON
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  context.renderMenu = () => {};
  context.renderOverview = () => {};
  context.updateStats = () => {};
  context.showToast = () => {};
  context.updateDeviceLangs = () => {};
  return context;
}

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

test('编辑分类时，不允许重名覆盖已有分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    A: { icon: 'x', items: [{ id: 1 }] },
    B: { icon: 'y', items: [{ id: 2 }] }
  };
  ctx.prompt = () => 'B';

  ctx.editCategory('A');

  assert.deepStrictEqual(Object.keys(ctx.productsData).sort(), ['A', 'B']);
  assert.strictEqual(ctx.productsData.B.items[0].id, 2);
});

test('分类名显示应优先使用 productsData 中的多语言名称', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.productsData.Custom = {
    icon: 'x',
    items: [],
    names: { zh: '自定义分类', en: 'Custom Category' }
  };

  assert.strictEqual(ctx.getCategoryName('Custom'), '自定义分类');
});

test('切换平台语言时应持久化并同步当前菜单语言', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK111';
  ctx.platformLang = 'zh';
  ctx.currentLang = 'zh';

  ctx.setPlatformLang('en');

  assert.strictEqual(ctx.platformLang, 'en');
  assert.strictEqual(ctx.currentLang, 'en');
  assert.strictEqual(ctx.localStorage.getItem('platformLang'), 'en');
});

test('点单屏预览：打开后应默认选中一个分类并渲染商品', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.currentDevice = 'RCK111';

  assert.strictEqual(typeof ctx.openOrderPreviewModal, 'function');
  ctx.openOrderPreviewModal();

  const categoryHtml = ctx.document.getElementById('orderPreviewCategories').innerHTML;
  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  const modal = ctx.document.getElementById('orderPreviewModal');

  assert.ok(categoryHtml.includes('3D拉花'));
  assert.ok(productHtml.includes('干卡布其诺'));
  assert.ok(modal.classList.contains('active'));
});

test('点单屏预览：切换分类后，右侧商品列表应联动更新', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();
  ctx.selectOrderPreviewCategory('新品推荐');

  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  assert.ok(productHtml.includes('橘皮拿铁'));
  assert.ok(!productHtml.includes('干卡布其诺'));
});

test('点单屏预览：应按当前语言展示分类与商品名称', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'en';
  ctx.openOrderPreviewModal();

  const categoryHtml = ctx.document.getElementById('orderPreviewCategories').innerHTML;
  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;

  assert.ok(categoryHtml.includes('3D Latte Art'));
  assert.ok(productHtml.includes('Dry Cappuccino*'));
});

test('点单屏预览：应提供语言切换下拉', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="orderPreviewLangSelect"'));
  assert.ok(html.includes('setOrderPreviewLang(this.value)'));
});

test('点单屏预览：语言切换下拉应与设备语言一致', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();

  const optionsHtml = ctx.document.getElementById('orderPreviewLangSelect').innerHTML;
  assert.ok(optionsHtml.includes('value="zh"'));
  assert.ok(optionsHtml.includes('value="en"'));
  assert.ok(optionsHtml.includes('value="jp"'));
  assert.ok(!optionsHtml.includes('value="ko"'));
});

test('点单屏预览：切换预览语言后应刷新商品文案', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK111';
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();

  assert.strictEqual(typeof ctx.setOrderPreviewLang, 'function');
  ctx.setOrderPreviewLang('en');

  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  const meta = ctx.document.getElementById('orderPreviewMeta').textContent;
  assert.ok(productHtml.includes('Dry Cappuccino*'));
  assert.ok(meta.includes('English'));
});

test('点单屏预览：左侧分类不显示在售商品合计', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();

  const categoryHtml = ctx.document.getElementById('orderPreviewCategories').innerHTML;
  assert.ok(!categoryHtml.includes('个在售商品'));
});

test('点单屏预览：右侧标题仅显示分类名，不带“商品”', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'en';
  ctx.openOrderPreviewModal();

  const title = ctx.document.getElementById('orderPreviewProductsTitle').textContent;
  assert.ok(title.includes('3D Latte Art'));
  assert.ok(!title.includes('商品'));
});

test('点单屏预览：有原价时应显示划线原价', () => {
  const ctx = loadMenuContext();
  const html = ctx.renderProductPriceHtml({
    price: 9.9,
    originalPrice: 12.9
  }, { compact: true });

  assert.ok(html.includes('order-preview-product-original-price'));
  assert.ok(html.includes('CNY 12.90'));
  assert.ok(html.includes('CNY 9.90'));
});

test('点单屏预览：推荐商品应显示推荐标签', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();

  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  assert.ok(productHtml.includes('order-preview-featured-badge'));
  assert.ok(productHtml.includes('推荐'));
});

test('点单屏预览：切换语言后推荐标签文案应同步', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();
  ctx.setOrderPreviewLang('en');

  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  assert.ok(productHtml.includes('order-preview-featured-badge'));
  assert.ok(productHtml.includes('Recommended'));
});

test('点单屏预览：点击商品应打开详情预览层', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.openOrderPreviewModal();

  assert.strictEqual(typeof ctx.openOrderPreviewProductDetail, 'function');
  ctx.openOrderPreviewProductDetail(1, encodeURIComponent('3D拉花'));

  const overlay = ctx.document.getElementById('orderPreviewDetailOverlay');
  assert.strictEqual(overlay.classList.contains('active'), true);
  assert.ok(overlay.innerHTML.includes('选咖啡豆'));
  assert.ok(overlay.innerHTML.includes('选择糖量'));
  assert.ok(overlay.innerHTML.includes('选择温度'));
  assert.ok(overlay.innerHTML.includes('选择浓度'));
});

test('点单屏详情预览：选项默认值应关联商品属性', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        {
          id: 101,
          price: 19.9,
          names: { zh: '测试摩卡' },
          descs: { zh: '测试描述' },
          defaultOptions: {
            beans: 'beanB',
            sweetness: 'sweetLow',
            temperature: 'tempHot',
            strength: 'strengthStrong',
            cupsize: '473ml'
          },
          specs: { zh: { beans: 'beanA' } },
          tagI18n: {
            beans: { beanA: { zh: '豆A' }, beanB: { zh: '豆B' } },
            sweetness: { sweetLow: { zh: '少糖' } },
            temperature: { tempHot: { zh: '热' } },
            strength: { strengthStrong: { zh: '加1份浓缩' } },
            cupsize: { '473ml': { zh: '473ml' } }
          }
        }
      ]
    }
  };

  ctx.openOrderPreviewModal();
  ctx.openOrderPreviewProductDetail(101, encodeURIComponent('测试分类'));

  const overlayHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(overlayHtml.includes('豆B'));
  assert.ok(overlayHtml.includes('少糖'));
  assert.ok(overlayHtml.includes('热'));
  assert.ok(overlayHtml.includes('加1份浓缩'));
  assert.ok(overlayHtml.includes('473ml'));
});

test('新增商品表单应包含原价输入项', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productOriginalPrice"'));
});

test('新增商品表单应支持本地图片上传', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productImageFile"'));
  assert.ok(html.includes('handleProductImageFileChange(event)'));
  assert.ok(/function\s+handleProductImageFileChange\s*\(/.test(html));
});

test('商品售价：支持币种展示与税前税后计算', () => {
  const ctx = loadMenuContext();
  ctx.document.getElementById('globalCurrencySelect').value = 'USD';
  ctx.document.getElementById('globalTaxEnabled').checked = true;
  ctx.document.getElementById('globalTaxRate').value = '10';
  ctx.saveMenuBasicSettings();
  const html = ctx.renderProductPriceHtml({
    price: 10
  }, { compact: false });

  assert.ok(html.includes('税前'));
  assert.ok(html.includes('税后'));
  assert.ok(html.includes('USD 10.00'));
  assert.ok(html.includes('USD 11.00'));
});

test('商品售价：未加税时仅展示单一价格', () => {
  const ctx = loadMenuContext();
  ctx.document.getElementById('globalCurrencySelect').value = 'EUR';
  ctx.document.getElementById('globalTaxEnabled').checked = false;
  ctx.document.getElementById('globalTaxRate').value = '';
  ctx.saveMenuBasicSettings();
  const html = ctx.renderProductPriceHtml({
    price: 12.5
  }, { compact: true });

  assert.ok(html.includes('EUR 12.50'));
  assert.ok(!html.includes('税前'));
  assert.ok(!html.includes('税后'));
});

test('菜单管理主页面应包含基础设置、菜单管理、批量改价三个tab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('menuInnerTabSettingsBtn'));
  assert.ok(html.includes('menuInnerTabManageBtn'));
  assert.ok(html.includes('menuInnerTabBatchBtn'));
  assert.ok(html.includes('menuSettingsPanel'));
  assert.ok(html.includes('menuManagePanel'));
  assert.ok(html.includes('menuBatchPanel'));
});

test('基础设置应包含设备语言、币种、税率配置输入，后台语言在顶部', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="langSelector"'));
  assert.ok(html.includes('id="deviceLangs"'));
  assert.ok(!html.includes('id="platformLangSelector"'));
  assert.ok(html.includes('id="globalCurrencySelect"'));
  assert.ok(html.includes('id="globalTaxEnabled"'));
  assert.ok(html.includes('id="globalTaxRate"'));
});

test('按钮归属：预览点单屏在基本设置tab，新增分类不在基本设置tab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const settingsPanelMatch = html.match(/<div id="menuSettingsPanel"[\s\S]*?<div id="menuManagePanel"/);
  assert.ok(settingsPanelMatch, '未找到基本设置面板片段');

  const settingsPanelHtml = settingsPanelMatch[0];
  assert.ok(settingsPanelHtml.includes('openOrderPreviewModal()'), '基本设置中缺少预览点单屏按钮');
  assert.ok(!settingsPanelHtml.includes('openCategoryModal()'), '基本设置中不应出现新增分类按钮');
});

test('按钮归属：新增分类按钮在菜单管理tab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const headerMatch = html.match(/<div class="header-right">[\s\S]*?<\/div>\s*<\/header>/);
  assert.ok(headerMatch, '未找到顶部操作区片段');
  assert.ok(/header-manage-action[^>]*openCategoryModal\(\)/.test(headerMatch[0]), '顶部操作区缺少新增分类按钮');
});

test('切换菜单内部tab时，应更新当前tab状态', () => {
  const ctx = loadMenuContext();
  assert.strictEqual(typeof ctx.switchMenuInnerTab, 'function');
  ctx.switchMenuInnerTab('manage');
  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), false);
  ctx.switchMenuInnerTab('batch');
  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), false);
  ctx.switchMenuInnerTab('settings');
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), false);
});

test('菜单管理页初始化时应支持通过 innerTab 参数选中菜单管理', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu&innerTab=manage';
  assert.strictEqual(typeof ctx.init, 'function');
  ctx.init();

  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), false);
});

test('菜单管理页初始化时应支持通过 innerTab 参数选中批量改价', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu&innerTab=batch';
  ctx.init();

  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), false);
});

test('跳转商品详情应使用短链接并将详情数据写入会话存储', () => {
  const ctx = loadMenuContext();
  assert.strictEqual(typeof ctx.goToDetail, 'function');
  ctx.goToDetail(2);

  const href = ctx.window.location.href;
  assert.ok(href.startsWith('product-detail.html?id=2&payloadKey='));
  assert.ok(!href.includes('product='));
  const payloadKey = new URLSearchParams(href.split('?')[1]).get('payloadKey');
  assert.ok(payloadKey);

  const raw = ctx.sessionStorage.getItem(`productDetailPayload:${payloadKey}`);
  assert.ok(raw, '会话存储中缺少详情数据');
  const payload = JSON.parse(raw);
  assert.ok(payload.product && payload.product.id === 2);
  assert.ok(payload.category);
  assert.ok(Array.isArray(payload.catalog));
  assert.ok(payload.catalog.length > 0);
});

test('跳转商品详情：会话存储异常时应降级到 window.name 传输', () => {
  const ctx = loadMenuContext();

  ctx.sessionStorage.setItem = () => {
    throw new Error('QuotaExceededError');
  };

  ctx.goToDetail(2);

  const href = ctx.window.location.href;
  assert.ok(href.startsWith('product-detail.html?id=2&payloadKey='));
  assert.ok(href.includes('payloadStore=windowName'));
  assert.ok(!href.includes('product='));
  assert.ok(!href.includes('category='));
  assert.ok(typeof ctx.window.name === 'string' && ctx.window.name.length > 0);

  const wrapped = JSON.parse(ctx.window.name);
  assert.strictEqual(wrapped.__type, 'productDetailPayload');
  assert.ok(wrapped.payload && wrapped.payload.product && wrapped.payload.product.id === 2);
  assert.ok(Array.isArray(wrapped.payload.catalog));
  assert.ok(wrapped.payload.catalog.length > 0);
  assert.ok(wrapped.payloadKey);
  assert.ok(!ctx.window.location.href.includes('product='));
  assert.ok(!ctx.window.location.href.includes('category='));
});

test('保存基础设置后，应将币种税率应用到菜单商品', () => {
  const ctx = loadMenuContext();
  ctx.document.getElementById('globalCurrencySelect').value = 'USD';
  ctx.document.getElementById('globalTaxEnabled').checked = true;
  ctx.document.getElementById('globalTaxRate').value = '10';

  ctx.saveMenuBasicSettings();

  const saved = JSON.parse(ctx.localStorage.getItem('menuBasicSettings'));
  assert.strictEqual(saved.currency, 'USD');
  assert.strictEqual(saved.taxEnabled, true);
  assert.strictEqual(saved.taxRate, 0.1);

  const anyItem = Object.values(ctx.productsData)[0].items[0];
  assert.strictEqual(anyItem.currency, 'USD');
  assert.strictEqual(anyItem.taxEnabled, true);
  assert.strictEqual(anyItem.taxRate, 0.1);
});

test('批量改价应作为第三个tab，且提供列表与分类筛选', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('menuInnerTabBatchBtn'), '缺少批量改价tab');
  assert.ok(html.includes('id="batchFixedPricePanel"'), '缺少批量固定改价面板');
  assert.ok(html.includes('id="batchFixedListContainer"'), '缺少批量改价列表容器');
  assert.ok(html.includes('id="batchFixedCategorySelect"'), '缺少分类筛选');
  assert.ok(html.includes('id="batchFixedKeyword"'), '缺少商品名搜索');
  assert.ok(html.includes('setBatchFixedPriceKeyword(this.value)'), '缺少商品名搜索联动');
  assert.ok(html.includes('id="batchFixedCurrentPrice"'), '缺少现价输入');
  assert.ok(html.includes('id="batchFixedOriginalPrice"'), '缺少原价输入');
  assert.ok(html.includes('id="batchSaleOnBtn"'), '缺少批量上架按钮');
  assert.ok(html.includes('id="batchSaleOffBtn"'), '缺少批量下架按钮');
  assert.ok(html.includes('submitBatchSaleStatusUpdate(true)'), '缺少批量上架动作');
  assert.ok(html.includes('submitBatchSaleStatusUpdate(false)'), '缺少批量下架动作');
  assert.ok(html.includes('id="batchFixedRetryBtn"'), '缺少失败重试按钮');
  assert.ok(!html.includes('id="batchFixedModeBtn"'), '不应保留菜单管理头部批量按钮');
});

test('批量改价列表应为文本行，不展示商品图片', () => {
  const ctx = loadMenuContext();
  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('__ALL__');
  ctx.renderBatchFixedPriceList();
  const listHtml = ctx.document.getElementById('batchFixedListContainer').innerHTML;
  assert.ok(!listHtml.includes('<img'));
  assert.ok(!listHtml.includes('product-image'));
});

test('批量改价：商品名搜索应过滤列表，且全选只作用于筛选结果', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 12, names: { zh: '经典拿铁' } },
        { id: 2, price: 11, originalPrice: 13, names: { zh: '榛果拿铁' } },
        { id: 3, price: 12, originalPrice: 14, names: { zh: '抹茶牛奶' } }
      ]
    }
  };

  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('__ALL__');
  assert.strictEqual(typeof ctx.setBatchFixedPriceKeyword, 'function');
  ctx.setBatchFixedPriceKeyword('拿铁');

  const listHtml = ctx.document.getElementById('batchFixedListContainer').innerHTML;
  assert.ok(listHtml.includes('经典拿铁'));
  assert.ok(listHtml.includes('榛果拿铁'));
  assert.ok(!listHtml.includes('抹茶牛奶'));

  ctx.handleBatchFixedSelectAllToggle(true);
  const snapshot = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(snapshot.selectedIds.includes(1), true);
  assert.strictEqual(snapshot.selectedIds.includes(2), true);
  assert.strictEqual(snapshot.selectedIds.includes(3), false);
});

test('批量固定改价：原价可不填，填写时必须大于现价', () => {
  const ctx = loadMenuContext();
  assert.strictEqual(typeof ctx.validateBatchFixedPriceInput, 'function');

  const validWithoutOriginal = ctx.validateBatchFixedPriceInput('11', '');
  assert.strictEqual(validWithoutOriginal.ok, true);
  assert.strictEqual(validWithoutOriginal.currentPrice, 11);
  assert.strictEqual(validWithoutOriginal.originalPrice, null);

  const validOnlyOriginal = ctx.validateBatchFixedPriceInput('', '19');
  assert.strictEqual(validOnlyOriginal.ok, true);
  assert.strictEqual(validOnlyOriginal.currentPrice, null);
  assert.strictEqual(validOnlyOriginal.originalPrice, 19);

  const invalidOriginal = ctx.validateBatchFixedPriceInput('11', '10');
  assert.strictEqual(invalidOriginal.ok, false);
  assert.ok(invalidOriginal.message.includes('原价需大于现价'));
});

test('批量固定改价：原价留空时应保持商品原价', () => {
  const ctx = loadMenuContext();
  assert.strictEqual(typeof ctx.computeFixedPricePatch, 'function');

  const keepOriginal = ctx.computeFixedPricePatch(
    { id: 1, price: 10, originalPrice: 12 },
    { currentPrice: 11, originalPrice: null }
  );
  assert.strictEqual(keepOriginal.ok, true);
  assert.strictEqual(keepOriginal.patch.price, 11);
  assert.strictEqual(keepOriginal.patch.originalPrice, 12);

  const updateOriginal = ctx.computeFixedPricePatch(
    { id: 1, price: 10, originalPrice: 12 },
    { currentPrice: 11, originalPrice: 13 }
  );
  assert.strictEqual(updateOriginal.ok, true);
  assert.strictEqual(updateOriginal.patch.originalPrice, 13);
});

test('批量固定改价：应支持部分成功，失败项保留选中，成功项自动取消选中', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 15, names: { zh: '商品1' } },
        { id: 2, price: 8, originalPrice: 12, names: { zh: '商品2' } }
      ]
    }
  };
  assert.strictEqual(typeof ctx.toggleBatchFixedPriceMode, 'function');
  assert.strictEqual(typeof ctx.setBatchFixedPriceSelectedIds, 'function');
  assert.strictEqual(typeof ctx.applyBatchFixedPriceBySelection, 'function');
  assert.strictEqual(typeof ctx.getBatchFixedPriceStateSnapshot, 'function');

  ctx.toggleBatchFixedPriceMode();
  ctx.setBatchFixedPriceActiveCategory('测试分类');
  ctx.setBatchFixedPriceSelectedIds([1, 2]);

  const originUpdater = ctx.updateSingleProductFixedPrice;
  ctx.updateSingleProductFixedPrice = (categoryKey, productId, input) => {
    if (productId === 2) {
      throw new Error('模拟失败');
    }
    return originUpdater(categoryKey, productId, input);
  };

  const applyResult = ctx.applyBatchFixedPriceBySelection('测试分类', { currentPrice: 11, originalPrice: null });
  assert.strictEqual(applyResult.successCount, 1);
  assert.strictEqual(applyResult.failedCount, 1);
  assert.strictEqual(ctx.productsData.测试分类.items[0].price, 11);
  assert.strictEqual(ctx.productsData.测试分类.items[1].price, 8);

  const batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(batchState.selectedIds.includes(1), false);
  assert.strictEqual(batchState.selectedIds.includes(2), true);
  assert.strictEqual(batchState.successIds.includes(1), true);
  assert.ok(String(batchState.failedMap[2]).includes('模拟失败'));
});

test('批量固定改价：重试失败项成功后应清除失败状态', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 15, names: { zh: '商品1' } },
        { id: 2, price: 8, originalPrice: 12, names: { zh: '商品2' } }
      ]
    }
  };

  ctx.toggleBatchFixedPriceMode();
  ctx.setBatchFixedPriceActiveCategory('测试分类');
  ctx.setBatchFixedPriceSelectedIds([1, 2]);

  const originUpdater = ctx.updateSingleProductFixedPrice;
  ctx.updateSingleProductFixedPrice = (categoryKey, productId, input) => {
    if (productId === 2) {
      throw new Error('模拟失败');
    }
    return originUpdater(categoryKey, productId, input);
  };
  ctx.applyBatchFixedPriceBySelection('测试分类', { currentPrice: 11, originalPrice: null });

  ctx.updateSingleProductFixedPrice = originUpdater;
  const retryResult = ctx.retryBatchFixedPriceFailures('测试分类', { currentPrice: 12, originalPrice: 16 });
  assert.strictEqual(retryResult.successCount, 1);
  assert.strictEqual(retryResult.failedCount, 0);
  assert.strictEqual(ctx.productsData.测试分类.items[1].price, 12);
  assert.strictEqual(ctx.productsData.测试分类.items[1].originalPrice, 16);

  const batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(batchState.failedMap[2], undefined);
  assert.strictEqual(batchState.selectedIds.includes(2), false);
});

test('批量固定改价：仅改原价时应保持现价，并对不合法行做部分失败', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 15, names: { zh: '商品1' } },
        { id: 2, price: 20, originalPrice: 25, names: { zh: '商品2' } }
      ]
    }
  };

  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('测试分类');
  ctx.setBatchFixedPriceSelectedIds([1, 2]);

  const result = ctx.applyBatchFixedPriceBySelection('测试分类', { currentPrice: null, originalPrice: 18 });
  assert.strictEqual(result.successCount, 1);
  assert.strictEqual(result.failedCount, 1);
  assert.strictEqual(ctx.productsData.测试分类.items[0].price, 10);
  assert.strictEqual(ctx.productsData.测试分类.items[0].originalPrice, 18);
  assert.strictEqual(ctx.productsData.测试分类.items[1].price, 20);
  assert.strictEqual(ctx.productsData.测试分类.items[1].originalPrice, 25);

  const batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(batchState.successIds.includes(1), true);
  assert.strictEqual(batchState.selectedIds.includes(1), false);
  assert.strictEqual(batchState.selectedIds.includes(2), true);
  assert.ok(String(batchState.failedMap[2]).includes('原价需大于现价'));
});

test('批量上下架：应按勾选项执行，并支持部分成功', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 12, onSale: true, names: { zh: '商品1' } },
        { id: 2, price: 11, originalPrice: 13, onSale: true, names: { zh: '商品2' } }
      ]
    }
  };

  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('__ALL__');
  ctx.setBatchFixedPriceSelectedIds([1, 2]);

  const originPersist = ctx.persistSingleProductEdit;
  ctx.persistSingleProductEdit = (product) => {
    if (product.id === 2) {
      throw new Error('模拟存储失败');
    }
    return originPersist(product);
  };

  assert.strictEqual(typeof ctx.applyBatchSaleStatusBySelection, 'function');
  const result = ctx.applyBatchSaleStatusBySelection('__ALL__', false);
  assert.strictEqual(result.successCount, 1);
  assert.strictEqual(result.failedCount, 1);
  assert.strictEqual(ctx.productsData.测试分类.items[0].onSale, false);
  assert.strictEqual(ctx.productsData.测试分类.items[1].onSale, true);

  const batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(batchState.successIds.includes(1), true);
  assert.strictEqual(batchState.selectedIds.includes(1), false);
  assert.strictEqual(batchState.selectedIds.includes(2), true);
  assert.ok(String(batchState.failedMap[2]).includes('模拟存储失败'));
});

test('批量固定改价：退出批量模式后应清除成功样式状态', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 15, names: { zh: '商品1' } }
      ]
    }
  };

  ctx.toggleBatchFixedPriceMode();
  ctx.setBatchFixedPriceActiveCategory('测试分类');
  ctx.setBatchFixedPriceSelectedIds([1]);
  ctx.applyBatchFixedPriceBySelection('测试分类', { currentPrice: 11, originalPrice: null });

  let batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(batchState.successIds.includes(1), true);

  ctx.toggleBatchFixedPriceMode();
  batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(batchState.successIds.length, 0);
  assert.strictEqual(batchState.selectedIds.length, 0);
  assert.strictEqual(Object.keys(batchState.failedMap).length, 0);
});
