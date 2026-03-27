const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadMenuContext() {
  const htmlPath = path.join(__dirname, '..', 'menu-management.html');
  const sharedPath = path.join(__dirname, '..', 'shared', 'admin-mock-data.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sharedScript = fs.readFileSync(sharedPath, 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) {
    throw new Error('menu-management.html 中未找到脚本代码');
  }

  let script = match[1]
    .replace('let deviceConfig = {', 'globalThis.deviceConfig = {')
    .replace('let productsData = {', 'globalThis.productsData = {')
    .replace(
      "let productsData = cloneSharedMenuProducts(sharedAdminMockData.defaultProducts || {});",
      "globalThis.productsData = cloneSharedMenuProducts(sharedAdminMockData.defaultProducts || {});"
    )
    .replace("let currentDevice = 'RCK111';", "globalThis.currentDevice = 'RCK111';")
    .replace("let currentLang = 'zh';", "globalThis.currentLang = 'zh';")
    .replace("let platformLang = 'zh';", "globalThis.platformLang = 'zh';")
    .replace(/let currentMenuInnerTab = '(settings|manage)';/, (_, tab) => `globalThis.currentMenuInnerTab = '${tab}';`)
    .replace("let batchFixedPriceKeyword = '';", "globalThis.batchFixedPriceKeyword = '';")
    .replace("let menuSharedCategoryFilter = '';", "globalThis.menuSharedCategoryFilter = '';")
    .replace("let menuManageActiveCategory = '';", "globalThis.menuManageActiveCategory = '';")
    .replace("let menuManageCategoryKeyword = '';", "globalThis.menuManageCategoryKeyword = '';")
    .replace("let menuManageProductKeyword = '';", "globalThis.menuManageProductKeyword = '';")
    .replace("let menuManageProductScope = 'current';", "globalThis.menuManageProductScope = 'current';")
    .replace(/let nextProductId = (\d+);/, (_, id) => `globalThis.nextProductId = ${id};`)
    .replace("let selectedCategoryIcon = '☕';", "globalThis.selectedCategoryIcon = '☕';")
    .replace('let editingProductId = null;', 'globalThis.editingProductId = null;')
    .replace("let editingProductCategory = '';", "globalThis.editingProductCategory = '';")
    .replace("let productCopyTargetCategory = '';", "globalThis.productCopyTargetCategory = '';")
    .replace("let categoryModalContext = 'default';", "globalThis.categoryModalContext = 'default';")
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
        children: [],
        parentNode: null,
        appendChild(child) {
          if (!child) return child;
          if (child.parentNode && child.parentNode !== this && typeof child.parentNode.removeChild === 'function') {
            child.parentNode.removeChild(child);
          }
          if (!this.children.includes(child)) this.children.push(child);
          child.parentNode = this;
          return child;
        },
        removeChild(child) {
          this.children = this.children.filter(item => item !== child);
          if (child && child.parentNode === this) child.parentNode = null;
          return child;
        },
        contains(target) {
          let current = target;
          while (current) {
            if (current === this) return true;
            current = current.parentNode || null;
          }
          return false;
        },
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

  const documentListeners = {};
  const windowListeners = {};
  const bodyClassNames = new Set();

  const context = {
    console,
    window: {
      location: { pathname: '/menu-management.html', search: '', href: '' },
      history: { replaceState() {} },
      addEventListener(type, handler) {
        windowListeners[type] = handler;
      },
      scrollY: 0,
      innerWidth: 1280,
      scrollTo(arg1, arg2) {
        if (typeof arg1 === 'object') {
          this.__lastScrollTo = { ...arg1 };
          this.scrollY = Number(arg1.top) || 0;
          return;
        }
        this.__lastScrollTo = { left: Number(arg1) || 0, top: Number(arg2) || 0 };
        this.scrollY = this.__lastScrollTo.top;
      }
    },
    localStorage,
    sessionStorage,
    document: {
      body: {
        classList: {
          add(name) { bodyClassNames.add(name); },
          remove(name) { bodyClassNames.delete(name); },
          toggle(name, force) {
            if (typeof force === 'boolean') {
              if (force) bodyClassNames.add(name);
              else bodyClassNames.delete(name);
              return force;
            }
            if (bodyClassNames.has(name)) {
              bodyClassNames.delete(name);
              return false;
            }
            bodyClassNames.add(name);
            return true;
          },
          contains(name) { return bodyClassNames.has(name); }
        }
      },
      addEventListener(type, handler) {
        documentListeners[type] = handler;
      },
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
  vm.runInContext(sharedScript, context);
  vm.runInContext(script, context);
  context.dispatchDocumentClick = (target) => {
    if (typeof documentListeners.click === 'function') {
        documentListeners.click({ target });
    }
  };
  context.dispatchWindowMessage = (data, origin = 'http://127.0.0.1:4174') => {
    if (typeof windowListeners.message === 'function') {
      windowListeners.message({ data, origin });
    }
  };
  context.__realRenderMenu = context.renderMenu;
  context.renderMenu = () => {};
  context.renderOverview = () => {};
  context.__realUpdateStats = context.updateStats;
  context.updateStats = () => {};
  context.showToast = () => {};
  context.__realUpdateDeviceLangs = context.updateDeviceLangs;
  context.updateDeviceLangs = () => {};
  return context;
}

function getSharedRuntimeDeviceIds(ctx) {
  return ctx.window.COFE_SHARED_MOCK_DATA.defaultDevices
    .filter(device => device && device.entered !== false && String(device.location || '').trim())
    .map(device => device.id);
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

test('菜单管理测试上下文应先加载共享 mock 数据源', () => {
  const ctx = loadMenuContext();
  assert.ok(ctx.window.COFE_SHARED_MOCK_DATA);
});

test('设备搜索：未存储设备时应直接使用共享设备源而非旧测试机回退值', () => {
  const ctx = loadMenuContext();
  const sharedDeviceIds = ctx.window.COFE_SHARED_MOCK_DATA.defaultDevices
    .filter(device => device && device.entered !== false && String(device.location || '').trim())
    .map(device => device.id);

  const options = ctx.loadDeviceSearchOptions().map(option => option.id);

  assert.deepStrictEqual(options, sharedDeviceIds);

  ctx.initDeviceSearch();

  assert.strictEqual(ctx.currentDevice, sharedDeviceIds[0]);
  assert.ok(!ctx.allDeviceOptions.includes('RCK111'));
  assert.ok(!ctx.allDeviceOptions.includes('RCK112'));
  assert.ok(!ctx.allDeviceOptions.includes('RCK113'));
});

test('分类编辑应支持通过统一弹窗修改多语言名称与图标', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('class="category-edit-btn"'));
  assert.ok(/function\s+openEditCategoryModal\s*\(/.test(html));
  assert.ok(/function\s+saveCategory\s*\(/.test(html));
  assert.ok(html.includes('id="categoryModalSubmitBtn"'));
  assert.ok(html.includes('id="categoryDeleteActionBtn"'));
});

test('分类编辑弹窗应只保留删除说明，不再展示顶部统计概览', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(!html.includes('id="categoryModalSummary"'));
  assert.ok(!html.includes('categoryModalTotalProducts'));
  assert.ok(!html.includes('categoryModalOrphanProducts'));
  assert.ok(html.includes('删除分类不会删除商品，但若存在仅属于该分类的商品，必须先指定承接分类。'));
});

test('删除分类影响分析应区分空分类、共享商品与需迁移商品', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    A: { icon: '☕', items: [{ id: 1 }, { id: 2 }] },
    B: { icon: '🎨', items: [{ id: 2 }] },
    C: { icon: '✨', items: [] }
  };
  ctx.localStorage.setItem('menuProductCategoryAssignments', JSON.stringify({
    1: ['A'],
    2: ['A', 'B']
  }));

  const impactA = ctx.getCategoryDeleteImpact('A');
  const impactC = ctx.getCategoryDeleteImpact('C');

  assert.strictEqual(impactA.totalProducts, 2);
  assert.deepStrictEqual(Array.from(impactA.orphanProductIds), [1]);
  assert.strictEqual(impactA.requiresTransfer, true);
  assert.deepStrictEqual(Array.from(impactA.transferCategoryKeys), ['B', 'C']);
  assert.strictEqual(impactC.totalProducts, 0);
  assert.strictEqual(impactC.requiresTransfer, false);
});

test('删除分类时应将仅属于该分类的商品迁移到承接分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    A: { icon: '☕', items: [{ id: 1, names: { zh: 'A1' } }, { id: 2, names: { zh: 'A2' } }] },
    B: { icon: '🎨', items: [{ id: 2, names: { zh: 'A2' } }] }
  };
  ctx.localStorage.setItem('menuProductCategoryAssignments', JSON.stringify({
    1: ['A'],
    2: ['A', 'B']
  }));

  ctx.deleteCategoryWithTransfer('A', 'B');

  assert.ok(!Object.prototype.hasOwnProperty.call(ctx.productsData, 'A'));
  const assignments = JSON.parse(ctx.localStorage.getItem('menuProductCategoryAssignments'));
  assert.deepStrictEqual(assignments['1'], ['B']);
  assert.deepStrictEqual(assignments['2'], ['B']);
  assert.deepStrictEqual(ctx.productsData.B.items.map(item => Number(item.id)).sort((a, b) => a - b), [1, 2]);
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

test('默认共享菜单 mock 应至少包含 10 个分类，并保留关键分类顺序', () => {
  const ctx = loadMenuContext();
  const categoryKeys = Object.keys(ctx.productsData);

  assert.ok(categoryKeys.length >= 10);
  assert.strictEqual(categoryKeys[0], '3D拉花');
  assert.ok(categoryKeys.includes('新品推荐'));
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

test('点单屏预览：应按菜单管理维护的分类顺序展示分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    分类A: {
      names: { zh: '分类A' },
      items: [{ id: 1, onSale: true, price: 10, names: { zh: '商品A' } }]
    },
    分类B: {
      names: { zh: '分类B' },
      items: [{ id: 2, onSale: true, price: 12, names: { zh: '商品B' } }]
    }
  };
  ctx.localStorage.setItem('categoryOrder', JSON.stringify(['分类B', '分类A']));

  ctx.openOrderPreviewModal();

  const categoryHtml = ctx.document.getElementById('orderPreviewCategories').innerHTML;
  assert.ok(categoryHtml.indexOf('分类B') < categoryHtml.indexOf('分类A'));
});

test('点单屏预览：应读取菜单管理持久化的商品编辑与分类归属', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    分类A: {
      names: { zh: '分类A' },
      items: [{ id: 1, onSale: true, price: 10, names: { zh: '旧名字' } }]
    },
    分类B: {
      names: { zh: '分类B' },
      items: []
    }
  };
  ctx.localStorage.setItem('menuProductEdits', JSON.stringify({
    1: { id: 1, onSale: true, price: 18, names: { zh: '新名字' } }
  }));
  ctx.localStorage.setItem('menuProductCategoryAssignments', JSON.stringify({
    1: ['分类B']
  }));

  const entries = ctx.getOrderPreviewCategoryEntries();
  const categoryA = entries.find(entry => entry.key === '分类A');
  const categoryB = entries.find(entry => entry.key === '分类B');

  assert.ok(categoryA);
  assert.ok(categoryB);
  assert.strictEqual(categoryA.items.length, 0);
  assert.strictEqual(categoryB.items.length, 1);
  assert.strictEqual(categoryB.items[0].names.zh, '新名字');
  assert.strictEqual(categoryB.items[0].price, 18);
});

test('点单屏预览：商品详情应按菜单管理最终数据查找商品', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    分类A: {
      names: { zh: '分类A' },
      items: [{ id: 1, onSale: true, price: 10, names: { zh: '旧名字' } }]
    },
    分类B: {
      names: { zh: '分类B' },
      items: []
    }
  };
  ctx.localStorage.setItem('menuProductEdits', JSON.stringify({
    1: { id: 1, onSale: true, price: 18, names: { zh: '新名字' } }
  }));
  ctx.localStorage.setItem('menuProductCategoryAssignments', JSON.stringify({
    1: ['分类B']
  }));

  ctx.openOrderPreviewModal();
  ctx.openOrderPreviewProductDetail(1, encodeURIComponent('分类B'));

  const detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(detailHtml.includes('新名字'));
});

test('点单屏预览：应按当前语言展示分类与商品名称', () => {
  const ctx = loadMenuContext();
  const runtimeDeviceId = getSharedRuntimeDeviceIds(ctx)[0];
  ctx.currentLang = 'en';
  ctx.currentDevice = runtimeDeviceId;
  ctx.ensureDeviceLanguageConfig(runtimeDeviceId);
  ctx.deviceConfig[runtimeDeviceId].defaultOrderPreviewLang = '';
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

test('语言管理：应支持为设备设置点单屏默认语言', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('点单屏默认'));
  assert.ok(/function\s+setDefaultOrderPreviewLang\s*\(/.test(html));

  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK111';
  ctx.openLangModal();

  const langListHtml = ctx.document.getElementById('langList').innerHTML;
  assert.ok(langListHtml.includes('点单屏默认'));
});

test('点单屏预览：打开时应优先使用设备配置的默认语言', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.currentLang = 'zh';
  ctx.deviceConfig.RCK112.defaultOrderPreviewLang = 'jp';

  ctx.openOrderPreviewModal();

  assert.strictEqual(ctx.document.getElementById('orderPreviewLangSelect').value, 'jp');
  assert.ok(ctx.document.getElementById('orderPreviewMeta').textContent.includes('日本語'));
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

test('点单屏预览：切换预览语言不应改写设备默认语言', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.deviceConfig.RCK112.defaultOrderPreviewLang = 'zh';
  ctx.openOrderPreviewModal();

  ctx.setOrderPreviewLang('en');

  assert.strictEqual(ctx.deviceConfig.RCK112.defaultOrderPreviewLang, 'zh');
});

test('语言管理：隐藏语言后应仅从当前设备可见语言中移除并保留语言数据', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  let confirmMessage = '';
  ctx.confirm = message => {
    confirmMessage = message;
    return true;
  };

  ctx.hideLanguage('jp');

  assert.ok(confirmMessage.includes('隐藏语言后，该语言的菜单将会不可见'));
  assert.deepStrictEqual(Array.from(ctx.getDeviceLangs()), ['zh', 'en']);
  assert.deepStrictEqual(Array.from(ctx.deviceConfig.RCK112.langs), ['zh', 'en', 'jp']);
  assert.strictEqual(ctx.deviceConfig.RCK112.langNames.jp, '日本語');
});

test('语言管理：隐藏当前默认语言后应回退到剩余第一种可见语言', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.deviceConfig.RCK112.defaultOrderPreviewLang = 'jp';

  ctx.hideLanguage('jp');

  assert.strictEqual(ctx.deviceConfig.RCK112.defaultOrderPreviewLang, 'zh');
});

test('点单屏预览：隐藏语言后不应再显示该语言选项', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';

  ctx.hideLanguage('jp');
  ctx.openOrderPreviewModal();

  const optionsHtml = ctx.document.getElementById('orderPreviewLangSelect').innerHTML;
  assert.ok(optionsHtml.includes('value="zh"'));
  assert.ok(optionsHtml.includes('value="en"'));
  assert.ok(!optionsHtml.includes('value="jp"'));
});

test('语言管理：应单独展示已隐藏语言列表并提供恢复显示按钮', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('已隐藏语言'));
  assert.ok(html.includes('id="hiddenLangList"'));

  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.hideLanguage('jp');
  ctx.openLangModal();

  const visibleHtml = ctx.document.getElementById('langList').innerHTML;
  const hiddenHtml = ctx.document.getElementById('hiddenLangList').innerHTML;

  assert.ok(!visibleHtml.includes('日本語'));
  assert.ok(hiddenHtml.includes('日本語'));
  assert.ok(hiddenHtml.includes('恢复显示'));
});

test('语言管理：恢复隐藏语言后应重新出现在设备语言与点单屏预览中', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.hideLanguage('jp');

  ctx.restoreHiddenLanguage('jp');

  assert.deepStrictEqual(Array.from(ctx.getDeviceLangs()), ['zh', 'en', 'jp']);
  assert.deepStrictEqual(Array.from(ctx.deviceConfig.RCK112.hiddenLangs || []), []);

  ctx.openOrderPreviewModal();
  const optionsHtml = ctx.document.getElementById('orderPreviewLangSelect').innerHTML;
  assert.ok(optionsHtml.includes('value="jp"'));
});

test('语言管理：新增语言表单改为预置语种下拉框', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(html.includes('id="newLangSelect"'));
  assert.ok(!html.includes('id="newLangName"'));
});

test('语言管理：新增语言时应从预置语种下拉中添加语言', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK111';
  let toastMessage = '';
  ctx.showToast = message => {
    toastMessage = message;
  };
  ctx.openLangModal();
  ctx.document.getElementById('newLangSelect').value = 'fr';

  ctx.addLanguage();

  assert.deepStrictEqual(Array.from(ctx.deviceConfig.RCK111.langs), ['zh', 'en', 'fr']);
  assert.strictEqual(ctx.deviceConfig.RCK111.langNames.fr, 'Français');
  assert.strictEqual(ctx.document.getElementById('newLangSelect').value, '');
  assert.ok(toastMessage.includes('已添加语言'));
});

test('语言管理：新增语言后应持久化当前设备语言配置，供详情页复用', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK111';
  ctx.openLangModal();
  ctx.document.getElementById('newLangSelect').value = 'fr';

  ctx.addLanguage();

  const stored = JSON.parse(ctx.localStorage.getItem('deviceLanguageConfig_RCK111') || '{}');
  assert.deepStrictEqual(Array.from(stored.langs || []), ['zh', 'en', 'fr']);
  assert.strictEqual(stored.langNames.fr, 'Français');
});

test('语言管理：当前设备已显示和已隐藏的语言不应出现在新增语种下拉中', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.hideLanguage('jp');
  ctx.openLangModal();

  const optionsHtml = ctx.document.getElementById('newLangSelect').innerHTML;

  assert.ok(!optionsHtml.includes('value="zh"'));
  assert.ok(!optionsHtml.includes('value="en"'));
  assert.ok(!optionsHtml.includes('value="jp"'));
  assert.ok(optionsHtml.includes('value="fr"'));
});

test('语言管理：无可添加语种时应禁用添加按钮', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK111';
  const device = ctx.ensureDeviceLanguageConfig('RCK111');
  device.langs = ['zh', 'en', 'jp', 'ko', 'th', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ar'];
  device.hiddenLangs = [];
  device.langNames = {
    zh: '中文',
    en: 'English',
    jp: '日本語',
    ko: '한국어',
    th: 'ไทย',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    it: 'Italiano',
    pt: 'Português',
    ru: 'Русский',
    ar: 'العربية'
  };

  ctx.openLangModal();

  assert.ok(ctx.document.getElementById('newLangSelect').innerHTML.includes('暂无可添加语种'));
  assert.strictEqual(Boolean(ctx.document.getElementById('newLangSubmitBtn').disabled), true);
});

test('语言管理：切换到新设备时应自动初始化默认语言配置', () => {
  const ctx = loadMenuContext();
  const newDeviceId = 'RCK990';
  let toastMessage = '';
  ctx.showToast = (message, type) => {
    toastMessage = `${type || 'info'}:${message}`;
  };
  ctx.localStorage.setItem('devicesData', JSON.stringify([
    { id: 'RCK111', location: 'k1001' },
    { id: newDeviceId, location: 'k8298' }
  ]));
  ctx.localStorage.setItem('locationsData', JSON.stringify([
    { code: 'k1001', name: '上海国家会展中心A馆' },
    { code: 'k8298', name: '上海市中心店' }
  ]));

  ctx.initDeviceSearch();
  ctx.document.getElementById('deviceSearchInput').value = '上海市中心店';
  ctx.changeDeviceByInput();

  assert.strictEqual(ctx.currentDevice, newDeviceId);
  assert.deepStrictEqual(Array.from(ctx.deviceConfig[newDeviceId].langs), ['zh', 'en']);
  assert.strictEqual(ctx.deviceConfig[newDeviceId].defaultOrderPreviewLang, 'zh');
  assert.strictEqual(ctx.deviceConfig[newDeviceId].langNames.zh, '中文');
  assert.strictEqual(ctx.deviceConfig[newDeviceId].langNames.en, 'English');

  ctx.openLangModal();
  ctx.document.getElementById('newLangSelect').value = 'zh';
  ctx.addLanguage();

  assert.deepStrictEqual(Array.from(ctx.getDeviceLangs()), ['zh', 'en']);
  assert.strictEqual(toastMessage, 'error:请选择语言');
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
  const runtimeDeviceId = getSharedRuntimeDeviceIds(ctx)[0];
  ctx.currentLang = 'en';
  ctx.currentDevice = runtimeDeviceId;
  ctx.ensureDeviceLanguageConfig(runtimeDeviceId);
  ctx.deviceConfig[runtimeDeviceId].defaultOrderPreviewLang = '';
  ctx.openOrderPreviewModal();

  const title = ctx.document.getElementById('orderPreviewProductsTitle').textContent;
  assert.ok(title.includes('3D Latte Art'));
  assert.ok(!title.includes('商品'));
});

test('点单屏详情预览：伪下单按钮区域应吸底显示，避免长内容下被遮挡', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/\.order-preview-detail-body\s*\{[\s\S]*padding:\s*14px 14px 96px;/.test(html));
  assert.ok(/\.order-preview-detail-submit-row\s*\{[\s\S]*position:\s*sticky;[\s\S]*bottom:\s*0;/.test(html));
  assert.ok(/\.order-preview-detail-submit-row\s*\{[\s\S]*padding:\s*14px 0 calc\(14px \+ env\(safe-area-inset-bottom, 0px\)\);/.test(html));
});

test('点单屏预览：移动端详情层应受模态可视高度约束，避免按钮落到裁切区外', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/\.order-preview-modal \.modal-body\s*\{[\s\S]*overflow-y:\s*hidden;/.test(html));
  assert.ok(/\.order-preview-layout\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*height:\s*calc\(90vh - 150px\);[\s\S]*min-height:\s*0;/.test(html));
  assert.ok(/\.order-preview-products\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*0;/.test(html));
});

test('点单屏预览：应优先读取商品自定义标签附加价格', () => {
  const ctx = loadMenuContext();
  const product = {
    tagI18n: {
      syrup: {
        榛果: { zh: '榛果', en: 'Hazelnut' }
      }
    },
    tagExtraPrices: {
      syrup: {
        榛果: 1.5
      }
    }
  };

  const items = ctx.getOrderPreviewOptionItems(product, 'syrup', 'zh');
  const hazelnut = items.find(item => item.key === '榛果');

  assert.ok(hazelnut);
  assert.strictEqual(hazelnut.extraPrice, 1.5);
});

test('点单屏详情预览：选择带附加价的标签后应更新顶部价格', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    Test: {
      icon: '☕',
      items: [{
        id: 101,
        names: { zh: '测试饮品' },
        descs: { zh: '测试描述' },
        price: 10,
        defaultOptions: {
          beans: '金奖黑咖-浓香意式',
          sweetness: '无糖',
          temperature: '热',
          strength: '标准'
        },
        specs: {
          zh: {
            beans: '金奖黑咖-浓香意式',
            sweetness: '无糖',
            temperature: '热',
            strength: '标准'
          }
        },
        tagI18n: {
          syrup: {
            榛果: { zh: '榛果' }
          }
        },
        tagExtraPrices: {
          syrup: {
            榛果: 2
          }
        }
      }]
    }
  };

  ctx.openOrderPreviewProductDetail(101, 'Test');
  ctx.selectOrderPreviewDetailOption('syrup', encodeURIComponent('榛果'));

  const detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(/[¥$]\s?12\.00/.test(detailHtml));
});

test('点单屏详情预览：应按商品真实配置渲染选项和附加价格', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    Test: {
      icon: '☕',
      items: [{
        id: 201,
        names: { zh: '糖浆测试饮品' },
        descs: { zh: '测试描述' },
        price: 10,
        defaultOptions: {
          beans: '金奖黑咖-浓香意式',
          syrup: '甘蔗冰糖糖浆',
          cupsize: '473ml',
          lid: '倡导环保 不使用杯盖'
        },
        specs: {
          zh: {
            beans: '金奖黑咖-浓香意式',
            syrup: '甘蔗冰糖糖浆',
            cupsize: '473ml',
            lid: '倡导环保 不使用杯盖'
          }
        },
        tagI18n: {
          syrup: {
            甘蔗冰糖糖浆: { zh: '甘蔗冰糖糖浆' },
            榛果风味糖浆: { zh: '榛果风味糖浆' }
          },
          cupsize: {
            '473ml': { zh: '473ml' }
          },
          lid: {
            倡导环保_不使用杯盖: { zh: '倡导环保 不使用杯盖' }
          }
        },
        tagExtraPrices: {
          syrup: {
            榛果风味糖浆: 2
          },
          cupsize: {
            '473ml': 1
          }
        }
      }]
    }
  };

  ctx.openOrderPreviewProductDetail(201, 'Test');

  const detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(detailHtml.includes('选择糖浆'));
  assert.ok(detailHtml.includes('榛果风味糖浆'));
  assert.ok(detailHtml.includes('+ ¥ 2.00'));
  assert.ok(detailHtml.includes('选择杯型'));
  assert.ok(detailHtml.includes('473ml'));
  assert.ok(detailHtml.includes('选择杯盖'));
  assert.ok(detailHtml.includes('倡导环保 不使用杯盖'));
});

test('点单屏详情预览：存在配方数据时也不展示当前配方区块', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    Test: {
      icon: '☕',
      items: [{
        id: 202,
        names: { zh: '配方联动测试' },
        descs: { zh: '测试描述' },
        price: 10,
        defaultOptions: {
          syrup: '甘蔗冰糖糖浆'
        },
        specs: {
          zh: {
            syrup: '甘蔗冰糖糖浆'
          }
        },
        tagI18n: {
          syrup: {
            甘蔗冰糖糖浆: { zh: '甘蔗冰糖糖浆' },
            榛果风味糖浆: { zh: '榛果风味糖浆' }
          }
        },
        optionRecipes: {
          syrup: {
            甘蔗冰糖糖浆: {
              groupOrder: ['syrup', 'water'],
              groups: {
                syrup: { names: ['甘蔗糖浆'], percent: 30 },
                water: { names: ['纯净水'], percent: 70 }
              }
            },
            榛果风味糖浆: {
              groupOrder: ['syrup', 'milk'],
              groups: {
                syrup: { names: ['榛果糖浆'], percent: 20 },
                milk: { names: ['鲜奶'], percent: 80 }
              }
            }
          }
        }
      }]
    }
  };

  ctx.openOrderPreviewProductDetail(202, 'Test');

  let detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(!detailHtml.includes('当前配方'));
  assert.ok(!detailHtml.includes('甘蔗糖浆'));
  assert.ok(!detailHtml.includes('纯净水'));

  ctx.selectOrderPreviewDetailOption('syrup', encodeURIComponent('榛果风味糖浆'));

  detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(!detailHtml.includes('当前配方'));
  assert.ok(!detailHtml.includes('榛果糖浆'));
  assert.ok(!detailHtml.includes('鲜奶'));
});

test('点单屏详情预览：应从附加价和配方映射补齐可选标签', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    Test: {
      icon: '☕',
      items: [{
        id: 204,
        names: { zh: '补齐标签测试' },
        descs: { zh: '测试描述' },
        price: 10,
        defaultOptions: {
          syrup: '经典糖浆'
        },
        tagI18n: {
          syrup: {
            经典糖浆: { zh: '经典糖浆' }
          }
        },
        tagExtraPrices: {
          syrup: {
            新品糖浆: 3
          }
        },
        optionRecipes: {
          syrup: {
            新品糖浆: {
              groupOrder: ['syrup', 'milk'],
              groups: {
                syrup: { names: ['新品风味糖浆'], percent: 25 },
                milk: { names: ['鲜奶'], percent: 75 }
              }
            }
          }
        }
      }]
    }
  };

  ctx.openOrderPreviewProductDetail(204, 'Test');

  let detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(detailHtml.includes('新品糖浆'));
  assert.ok(detailHtml.includes('+ ¥ 3.00'));
  assert.ok(!detailHtml.includes('当前配方'));

  ctx.selectOrderPreviewDetailOption('syrup', encodeURIComponent('新品糖浆'));
  detailHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(detailHtml.includes('新品糖浆'));
  assert.ok(!detailHtml.includes('当前配方'));
  assert.ok(!detailHtml.includes('新品风味糖浆'));
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

test('菜单管理顶部统计卡应只展示商品总数和在售商品数', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const statsStart = html.indexOf('<div class="stats-bar">');
  const statsEnd = html.indexOf('<div id="menuManageSharedContextSlot"', statsStart);
  const statsSection = statsStart >= 0 && statsEnd > statsStart ? html.slice(statsStart, statsEnd) : html;

  assert.ok(/id="totalProducts"/.test(statsSection));
  assert.ok(/id="onSaleProducts"/.test(statsSection));
  assert.ok(/<div class="stat-label">商品总数<\/div>/.test(statsSection));
  assert.ok(/<div class="stat-label">在售商品数<\/div>/.test(statsSection));
  assert.ok(!statsSection.includes('id="featuredCount"'));
  assert.ok(!statsSection.includes('商品分类'));
  assert.ok(!statsSection.includes('支持语言'));
});

test('菜单管理顶部统计应按商品 ID 去重计算商品总数和在售商品数', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    经典: {
      icon: '☕',
      items: [
        { id: 1, onSale: false, names: { zh: '经典一号' } },
        { id: 2, onSale: true, names: { zh: '经典二号' } }
      ]
    },
    新品: {
      icon: '🆕',
      items: [
        { id: 1, onSale: false, names: { zh: '经典一号' } },
        { id: 3, onSale: false, names: { zh: '新品三号' } }
      ]
    }
  };

  ctx.__realUpdateStats();

  assert.strictEqual(ctx.document.getElementById('totalProducts').textContent, 3);
  assert.strictEqual(ctx.document.getElementById('onSaleProducts').textContent, 1);
});

test('点单屏预览：业务标签应显示前两个启用标签并隐藏停用标签', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.window.COFE_SHARED_MOCK_DATA.defaultBusinessTags = {
    tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' },
    tag_new: { id: 'tag_new', names: { zh: '新品', en: 'New' }, status: 'active' },
    tag_hidden: { id: 'tag_hidden', names: { zh: '隐藏标签', en: 'Hidden tag' }, status: 'disabled' }
  };
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      names: { zh: '测试分类', en: 'Test Category' },
      items: [
        {
          id: 101,
          price: 19.9,
          onSale: true,
          names: { zh: '测试拿铁', en: 'Test Latte' },
          descs: { zh: '测试描述', en: 'Test description' },
          businessTagIds: ['tag_signature', 'tag_new', 'tag_hidden']
        }
      ]
    }
  };
  ctx.openOrderPreviewModal();

  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  assert.ok(productHtml.includes('招牌'));
  assert.ok(productHtml.includes('新品'));
  assert.ok(!productHtml.includes('隐藏标签'));
  assert.ok(!productHtml.includes('order-preview-featured-badge'));
});

test('点单屏预览：切换语言后业务标签文案应同步', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.window.COFE_SHARED_MOCK_DATA.defaultBusinessTags = {
    tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' },
    tag_new: { id: 'tag_new', names: { zh: '新品', en: 'New' }, status: 'active' },
    tag_hidden: { id: 'tag_hidden', names: { zh: '隐藏标签', en: 'Hidden tag' }, status: 'disabled' }
  };
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      names: { zh: '测试分类', en: 'Test Category' },
      items: [
        {
          id: 101,
          price: 19.9,
          onSale: true,
          names: { zh: '测试拿铁', en: 'Test Latte' },
          descs: { zh: '测试描述', en: 'Test description' },
          businessTagIds: ['tag_signature', 'tag_new', 'tag_hidden']
        }
      ]
    }
  };
  ctx.openOrderPreviewModal();
  ctx.setOrderPreviewLang('en');

  const productHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;
  assert.ok(productHtml.includes('Signature'));
  assert.ok(productHtml.includes('New'));
  assert.ok(!productHtml.includes('Hidden tag'));
  assert.ok(!productHtml.includes('order-preview-featured-badge'));
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

test('点单屏详情预览：默认选中项应排在每组选项最左侧', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  const product = {
    id: 105,
    price: 19.9,
    names: { zh: '排序测试饮品' },
    descs: { zh: '测试描述' },
    defaultOptions: {
      syrup: '榛果风味糖浆',
      temperature: '冰'
    },
    tagI18n: {
      syrup: {
        甘蔗冰糖糖浆: { zh: '甘蔗冰糖糖浆' },
        香草风味糖浆: { zh: '香草风味糖浆' },
        榛果风味糖浆: { zh: '榛果风味糖浆' },
        无糖浆: { zh: '无糖浆' }
      }
    }
  };
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [product]
    }
  };

  const syrupItems = ctx.getOrderPreviewOptionItems(product, 'syrup', 'zh');
  const temperatureItems = ctx.getOrderPreviewOptionItems(product, 'temperature', 'zh');

  assert.strictEqual(syrupItems[0].key, '榛果风味糖浆');
  assert.strictEqual(temperatureItems[0].key, '冰');
});

test('点单屏预览：伪下单应把当前详情商品写入本地订单记录', () => {
  const ctx = loadMenuContext();
  const categoryKey = Object.keys(ctx.productsData)[0];
  const product = ctx.productsData[categoryKey].items[0];

  ctx.openOrderPreviewModal();
  ctx.openOrderPreviewProductDetail(product.id, encodeURIComponent(categoryKey));
  ctx.changeOrderPreviewDetailQuantity(1);
  ctx.createPreviewOrder();

  const saved = JSON.parse(ctx.localStorage.getItem('ordersPreviewRecords') || '[]');
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].deviceId, ctx.currentDevice);
  assert.strictEqual(saved[0].orderItems[0].name, product.names.zh || product.names.en);
  assert.strictEqual(saved[0].orderItems[0].quantity, 2);
  assert.strictEqual(saved[0].status, 'done');
  assert.strictEqual(saved[0].paymentStatus, 'succeed');
});

test('复制商品流程应保留工具栏与网格入口文案，并移除头部重复入口', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes("openCopyProductModal(menuManageActiveCategory || '')"));
  assert.ok(html.includes('openCopyProductModal(\'${categoryName}\')'));
  assert.ok(!/header-manage-action[^>]*openCopyProductModal\(\)/.test(html));
  assert.ok(html.includes('复制商品'));
  assert.ok(!html.includes('>添加商品<'));
  assert.ok(!html.includes('>新增商品<'));
});

test('复制商品第一步应先选择目标分类，并支持直接新增分类', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="copyProductRangeStep"'));
  assert.ok(html.includes('id="copyProductConfigStep"'));
  assert.ok(html.includes('id="copyProductScopeCurrent"'));
  assert.ok(html.includes('id="copyProductScopeOther"'));
  assert.ok(html.includes('id="copyProductTargetDeviceRow"'));
  assert.ok(html.includes('id="copyProductTargetDeviceSearch"'));
  assert.ok(html.includes('id="copyProductTargetDeviceSummary"'));
  assert.ok(html.includes('id="copyProductTargetDeviceOptions"'));
  assert.ok(html.includes('selectAllFilteredCopyProductDevices()'));
  assert.ok(html.includes('clearCopyProductTargetDevices()'));
  assert.ok(html.includes('目标分类'));
  assert.ok(html.includes('class="copy-product-target-controls"'));
  assert.ok(html.includes('id="copyProductTargetCategorySummary"'));
  assert.ok(html.includes('id="copyProductTargetCategoryChips"'));
  assert.ok(html.includes('id="copyProductTargetCategoryOptions"'));
  assert.ok(html.includes('id="copyProductSyncModeGroup"'));
  assert.ok(html.includes('id="copyProductCategorySyncMode"'));
  assert.ok(html.includes('id="copyCategorySyncExistingOnly"'));
  assert.ok(html.includes('id="copyCategorySyncAutoCreate"'));
  assert.ok(html.includes("openCategoryModal('copyTargetCategory')"));
  assert.ok(/\.copy-product-target-controls\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*1fr auto;[\s\S]*align-items:\s*center;/.test(html));
  assert.ok(!html.includes('模板所属分类'));
});

test('复制商品表单应包含原价输入项', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productOriginalPrice"'));
});

test('复制/编辑商品弹窗应支持多分类归属选择', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productCategorySummary"'));
  assert.ok(html.includes('id="productCategoryChips"'));
  assert.ok(html.includes('id="productCategoryOptions"'));
  assert.ok(!html.includes('id="productCategory"'));
});

test('复制商品表单应支持本地图片上传', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productImageFile"'));
  assert.ok(html.includes('handleProductImageFileChange(event)'));
  assert.ok(/function\s+handleProductImageFileChange\s*\(/.test(html));
});

test('复制商品详情页应提供图片替换对比预览区域', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productImageCompare"'));
  assert.ok(html.includes('id="productImageCompareStatus"'));
  assert.ok(html.includes('id="productImageBeforePreview"'));
  assert.ok(html.includes('id="productImageAfterPreview"'));
  assert.ok(html.includes('oninput="renderProductImageComparePreview()"'));
  assert.ok(/function\s+renderProductImageComparePreview\s*\(/.test(html));
});

test('复制商品应继承标签与配方相关结构，并生成新的商品ID', () => {
  const ctx = loadMenuContext();
  ctx.nextProductId = 200;
  const source = {
    id: 88,
    price: 15.5,
    originalPrice: 18.5,
    featured: false,
    image: 'https://example.com/a.png',
    names: { zh: '原商品' },
    descs: { zh: '原描述' },
    specs: { zh: { beans: '豆A' } },
    options: { BEAN: '豆A' },
    defaultOptions: { beans: 'beanA' },
    tagI18n: { beans: { beanA: { zh: '豆A' } } },
    tagExtraPrices: { beans: { beanA: 2 } },
    optionRecipes: { beans: { beanA: { syrup: { names: ['糖浆'], percent: 100 } } } },
    optionRecipeLinks: { beans: { beanA: 'beans:beanA' } },
    onSale: false
  };

  const copied = ctx.cloneProductForCopy(source);

  assert.strictEqual(copied.id, 200);
  assert.strictEqual(ctx.nextProductId, 201);
  assert.strictEqual(copied.price, 15.5);
  assert.strictEqual(copied.originalPrice, 18.5);
  assert.strictEqual(JSON.stringify(copied.defaultOptions), JSON.stringify({ beans: 'beanA' }));
  assert.strictEqual(JSON.stringify(copied.tagExtraPrices), JSON.stringify({ beans: { beanA: 2 } }));
  assert.strictEqual(JSON.stringify(copied.optionRecipeLinks), JSON.stringify({ beans: { beanA: 'beans:beanA' } }));
  copied.tagExtraPrices.beans.beanA = 9;
  assert.strictEqual(source.tagExtraPrices.beans.beanA, 2);
  copied.optionRecipes.beans.beanA.syrup.percent = 60;
  assert.strictEqual(source.optionRecipes.beans.beanA.syrup.percent, 100);
});

test('复制商品模板列表应支持跨分类聚合，并显示来源分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, names: { zh: '干卡布其诺' } }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: [{ id: 2, names: { zh: '橘皮拿铁' } }]
    }
  };

  const entries = ctx.getCopyProductTemplateEntries();

  assert.strictEqual(entries.length, 2);
  assert.ok(entries.some(item => item.categoryName === '拉花' && item.label.includes('拉花')));
  assert.ok(entries.some(item => item.categoryName === '新品' && item.label.includes('新品')));
});

test('从复制商品流程新增分类后，应追加选中新建的目标分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, names: { zh: '干卡布其诺' } }]
    },
    新品分类: {
      icon: '🆕',
      names: { zh: '新品分类' },
      items: []
    }
  };

  ctx.setCopyProductTargetCategories(['拉花']);
  ctx.applyCopyProductTargetCategory('新品分类');

  const selected = ctx.getSelectedCopyProductTargetCategories().sort();
  assert.strictEqual(selected.join(','), '拉花,新品分类');
  assert.strictEqual(ctx.productCopyTargetCategory, '拉花');
});

test('复制商品第一步：应默认勾选目标分类，并允许追加其他分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, names: { zh: '商品1' } }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    },
    经典: {
      icon: '⭐',
      names: { zh: '经典' },
      items: []
    }
  };

  ctx.openCopyProductModal('新品');
  ctx.startCopyProduct();

  let selected = ctx.getSelectedCopyProductTargetCategories();
  assert.strictEqual(selected.join(','), '新品');

  ctx.setCopyProductTargetCategories(['新品', '经典']);
  selected = ctx.getSelectedCopyProductTargetCategories().sort();
  assert.strictEqual(selected.join(','), '新品,经典');
});

test('复制商品第一步：点击外部区域后应收起目标分类选择器', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, names: { zh: '商品1' } }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };

  const selector = ctx.document.getElementById('copyProductTargetCategorySelector');
  selector.contains = (target) => target === selector;

  ctx.openCopyProductModal('新品');
  ctx.startCopyProduct();
  ctx.toggleCopyProductTargetCategorySelector(true);
  assert.strictEqual(ctx.document.getElementById('copyProductTargetCategoryOptions').classList.contains('active'), true);

  ctx.dispatchDocumentClick(ctx.document.getElementById('outside'));

  assert.strictEqual(ctx.document.getElementById('copyProductTargetCategoryOptions').classList.contains('active'), false);
});

test('复制商品第二步完成后，应跳转到详情页复制模式并带入多选目标分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    },
    经典: {
      icon: '⭐',
      names: { zh: '经典' },
      items: []
    }
  };

  ctx.openCopyProductModal('新品');
  ctx.startCopyProduct();
  ctx.setCopyProductTargetCategories(['新品', '经典']);
  ctx.document.getElementById('copyProductSourceProduct').value = `${encodeURIComponent('拉花')}::1`;

  ctx.startCopyProduct();

  const href = ctx.window.location.href;
  assert.ok(href.startsWith('product-detail.html?id=1&payloadKey='));
  assert.ok(href.includes('mode=copy'));
  const payloadKey = new URLSearchParams(href.split('?')[1]).get('payloadKey');
  assert.ok(payloadKey);

  const raw = ctx.sessionStorage.getItem(`productDetailPayload:${payloadKey}`);
  assert.ok(raw);
  const payload = JSON.parse(raw);
  assert.deepStrictEqual(payload.copyWorkflow.targetCategories, ['新品', '经典']);
  assert.strictEqual(payload.copyWorkflow.sourceCategoryKey, '拉花');
  assert.strictEqual(payload.copyWorkflow.mode, 'copy');
  assert.strictEqual(ctx.document.getElementById('productModal').classList.contains('active'), false);
});

test('复制商品：第一步选择其他设备时，应要求先选择目标设备', () => {
  const ctx = loadMenuContext();
  let toastMessage = '';
  ctx.showToast = (message, type) => {
    toastMessage = `${type || 'info'}:${message}`;
  };
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    }
  };
  ctx.allDeviceOptions = ['RCK111', 'RCK112'];

  ctx.openCopyProductModal('拉花');
  ctx.setCopyProductScope('other');
  ctx.startCopyProduct();

  assert.strictEqual(toastMessage, 'error:请至少选择一个目标设备');
  assert.strictEqual(ctx.document.getElementById('copyProductConfigStep').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('copyProductRangeStep').classList.contains('active'), true);

  ctx.toggleCopyProductTargetDeviceSelection('RCK112', true);
  ctx.startCopyProduct();
  assert.strictEqual(ctx.document.getElementById('copyProductConfigStep').classList.contains('active'), true);
});

test('复制商品跳转详情页时，应带入多设备批量复制上下文', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };
  ctx.allDeviceOptions = ['RCK111', 'RCK112', 'RCK113'];

  const nameInput = ctx.document.querySelector('.product-name-zh');
  ctx.openCopyProductModal('新品');
  ctx.setCopyProductScope('other');
  ctx.toggleCopyProductTargetDeviceSelection('RCK112', true);
  ctx.toggleCopyProductTargetDeviceSelection('RCK113', true);
  ctx.startCopyProduct();
  ctx.document.getElementById('copyProductSourceProduct').value = `${encodeURIComponent('拉花')}::1`;
  ctx.startCopyProduct();

  const href = ctx.window.location.href;
  const payloadKey = new URLSearchParams(href.split('?')[1]).get('payloadKey');
  const raw = ctx.sessionStorage.getItem(`productDetailPayload:${payloadKey}`);
  const payload = JSON.parse(raw);

  assert.deepStrictEqual(payload.copyWorkflow.targetDeviceIds, ['RCK112', 'RCK113']);
  assert.strictEqual(payload.copyWorkflow.categorySyncMode, 'existing_only');
  assert.strictEqual(payload.copyWorkflow.mode, 'copy');
});

test('复制商品：本设备复制时不应显示缺失分类处理，其他设备复制时显示', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };
  ctx.allDeviceOptions = ['RCK111', 'RCK112'];

  ctx.openCopyProductModal('新品');
  ctx.startCopyProduct();
  assert.strictEqual(ctx.document.getElementById('copyProductSyncModeGroup').style.display, 'none');

  ctx.closeCopyProductModal();
  ctx.openCopyProductModal('新品');
  ctx.setCopyProductScope('other');
  ctx.toggleCopyProductTargetDeviceSelection('RCK112', true);
  ctx.startCopyProduct();
  assert.strictEqual(ctx.document.getElementById('copyProductSyncModeGroup').style.display, '');
});

test('复制商品：第二步点击上一步时，应先弹窗确认再返回复制范围', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };

  ctx.openCopyProductModal('新品');
  assert.strictEqual(ctx.document.getElementById('copyProductBackBtn').style.display, 'none');
  ctx.startCopyProduct();
  assert.strictEqual(ctx.document.getElementById('copyProductConfigStep').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('copyProductBackBtn').style.display, 'inline-flex');

  ctx.goCopyProductPrevStep();

  assert.strictEqual(ctx.document.getElementById('copyProductBackConfirmModal').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('copyProductConfigStep').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('copyProductRangeStep').classList.contains('active'), false);

  ctx.confirmCopyProductPrevStep();

  assert.strictEqual(ctx.document.getElementById('copyProductBackConfirmModal').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('copyProductRangeStep').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('copyProductConfigStep').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('copyProductBackBtn').style.display, 'none');
});

test('编辑商品弹窗：应默认勾选同一商品已挂载的所有分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    经典: {
      icon: '⭐',
      names: { zh: '经典' },
      items: []
    }
  };

  ctx.openProductModal('拉花', ctx.productsData.拉花.items[0], '拉花');

  const selected = Array.from(ctx.getSelectedProductModalCategories()).sort();
  assert.strictEqual(selected.join(','), '拉花,新品');
});

test('复制商品弹窗：应默认勾选目标分类，并允许追加其他分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    },
    经典: {
      icon: '⭐',
      names: { zh: '经典' },
      items: []
    }
  };

  ctx.openProductModal('新品', null, '', ctx.productsData.拉花.items[0], '拉花');

  let selected = ctx.getSelectedProductModalCategories();
  assert.strictEqual(selected.join(','), '新品');

  ctx.setProductModalSelectedCategories(['新品', '经典']);
  selected = ctx.getSelectedProductModalCategories().sort();
  assert.strictEqual(selected.join(','), '新品,经典');
});

test('复制商品详情页：应展示图片新旧对比，并在编辑模式隐藏', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, image: 'https://example.com/p1.png', names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };

  const source = ctx.productsData.拉花.items[0];
  ctx.openProductModal('新品', null, '', source, '拉花');

  assert.strictEqual(ctx.document.getElementById('productImageCompare').style.display, 'block');
  assert.strictEqual(ctx.document.getElementById('productImageCompareStatus').textContent, '未替换图片');
  assert.strictEqual(ctx.document.getElementById('productImageBeforePreview').src, 'https://example.com/p1.png');
  assert.strictEqual(ctx.document.getElementById('productImageAfterPreview').src, 'https://example.com/p1.png');

  ctx.document.getElementById('productImage').value = 'https://example.com/new.png';
  ctx.renderProductImageComparePreview();
  assert.strictEqual(ctx.document.getElementById('productImageCompareStatus').textContent, '已替换图片');
  assert.strictEqual(ctx.document.getElementById('productImageAfterPreview').src, 'https://example.com/new.png');

  ctx.openProductModal('拉花', source, '拉花');
  assert.strictEqual(ctx.document.getElementById('productImageCompare').style.display, 'none');
});

test('复制商品详情页：仅保留多语言商品信息，不展示配方描述字段', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{
        id: 1,
        price: 10,
        originalPrice: 12,
        names: { zh: '商品1', en: 'Product1' },
        specs: { zh: { beans: '豆A', temperature: '热', strength: '标准', note: '大杯' } },
        descs: { zh: '豆A、热、标准、大杯' },
        onSale: true
      }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };

  const source = ctx.productsData.拉花.items[0];
  ctx.openProductModal('新品', null, '', source, '拉花');
  let html = ctx.document.getElementById('productLangInputs').innerHTML;
  assert.ok(html.includes('商品名称'));
  assert.ok(!html.includes('咖啡豆描述'));
  assert.ok(!html.includes('温度描述'));
  assert.ok(!html.includes('浓度描述'));
  assert.ok(!html.includes('其他描述'));

  ctx.openProductModal('拉花', source, '拉花');
  html = ctx.document.getElementById('productLangInputs').innerHTML;
  assert.ok(html.includes('咖啡豆描述'));
  assert.ok(html.includes('温度描述'));
});

test('复制商品弹窗：来源商品预览应优先显示完整商品描述', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{
        id: 1,
        price: 10,
        originalPrice: 12,
        names: { zh: '商品1' },
        descs: { zh: '这是一段完整商品描述' },
        specs: { zh: { beans: '金奖黑咖-浓香意式', temperature: '冰', strength: '标准' } },
        onSale: true
      }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    }
  };

  ctx.prepareCopyProductConfigStep('新品');

  const html = ctx.document.getElementById('copyProductSourcePreview').innerHTML;
  assert.ok(html.includes('这是一段完整商品描述'));
  assert.ok(!html.includes('金奖黑咖-浓香意式、冰、标准'));
});

test('编辑商品弹窗：保存后应按多分类归属回放商品挂载', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    },
    经典: {
      icon: '⭐',
      names: { zh: '经典' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    }
  };

  const nameInput = ctx.document.querySelector('.product-name-zh');
  ctx.openProductModal('拉花', ctx.productsData.拉花.items[0], '拉花');
  ctx.setProductModalSelectedCategories(['拉花', '新品']);
  nameInput.value = '商品1-新';
  ctx.document.getElementById('productPrice').value = '11';
  ctx.document.getElementById('productOriginalPrice').value = '13';
  ctx.document.getElementById('productFeatured').checked = true;

  ctx.addProduct();

  const assignments = JSON.parse(ctx.localStorage.getItem('menuProductCategoryAssignments') || '{}');
  assert.deepStrictEqual(assignments['1'], ['拉花', '新品']);
  assert.strictEqual(ctx.productsData.拉花.items.filter(item => item.id === 1).length, 1);
  assert.strictEqual(ctx.productsData.新品.items.filter(item => item.id === 1).length, 1);
  assert.strictEqual(ctx.productsData.经典.items.filter(item => item.id === 1).length, 0);
  assert.strictEqual(ctx.productsData.新品.items.find(item => item.id === 1).price, 11);
});

test('复制商品弹窗：保存后应按多分类归属挂载新商品', () => {
  const ctx = loadMenuContext();
  ctx.nextProductId = 100;
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: []
    },
    经典: {
      icon: '⭐',
      names: { zh: '经典' },
      items: []
    }
  };

  const nameInput = ctx.document.querySelector('.product-name-zh');
  ctx.openProductModal('新品', null, '', ctx.productsData.拉花.items[0], '拉花');
  ctx.setProductModalSelectedCategories(['新品', '经典']);
  nameInput.value = '商品100';
  ctx.document.getElementById('productPrice').value = '12';
  ctx.document.getElementById('productOriginalPrice').value = '15';
  ctx.document.getElementById('productFeatured').checked = true;

  ctx.addProduct();

  const assignments = JSON.parse(ctx.localStorage.getItem('menuProductCategoryAssignments') || '{}');
  assert.deepStrictEqual(assignments['100'], ['新品', '经典']);
  assert.strictEqual(ctx.productsData.新品.items.filter(item => item.id === 100).length, 1);
  assert.strictEqual(ctx.productsData.经典.items.filter(item => item.id === 100).length, 1);
  assert.strictEqual(ctx.productsData.拉花.items.filter(item => item.id === 100).length, 0);
  assert.strictEqual(ctx.productsData.新品.items.find(item => item.id === 100).price, 12);
});

test('商品售价：应统一展示基础售价与原价，不再区分税前税后', () => {
  const ctx = loadMenuContext();
  ctx.localStorage.setItem('menuBasicSettings', JSON.stringify({
    currency: 'USD',
    taxEnabled: true,
    taxRate: 0.1
  }));
  ctx.loadMenuBasicSettings();
  const html = ctx.renderProductPriceHtml({
    price: 10,
    originalPrice: 12
  }, { compact: false });

  assert.ok(html.includes('USD 10.00'));
  assert.ok(html.includes('USD 12.00'));
  assert.ok(!html.includes('税前'));
  assert.ok(!html.includes('税后'));
});

test('基础设置：价格说明应只保留币种说明，不再出现税率文案', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('全局生效，统一菜单商品显示币种'));
  assert.ok(!html.includes('默认显示税后价格'));
  assert.ok(!html.includes('税率'));
  assert.ok(!html.includes('税费'));
});

test('商品售价：紧凑模式下仅展示单一价格与原价', () => {
  const ctx = loadMenuContext();
  ctx.document.getElementById('globalCurrencySelect').value = 'EUR';
  ctx.saveMenuBasicSettings();
  const html = ctx.renderProductPriceHtml({
    price: 12.5,
    originalPrice: 15
  }, { compact: true });

  assert.ok(html.includes('EUR 12.50'));
  assert.ok(html.includes('EUR 15.00'));
  assert.ok(!html.includes('税前'));
  assert.ok(!html.includes('税后'));
});

test('菜单管理主页面应按菜单管理、基本设置、批量改价顺序展示三个tab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const settingsIndex = html.indexOf('id="menuInnerTabSettingsBtn"');
  const manageIndex = html.indexOf('id="menuInnerTabManageBtn"');
  const batchIndex = html.indexOf('id="menuInnerTabBatchBtn"');

  assert.ok(manageIndex > -1);
  assert.ok(settingsIndex > -1);
  assert.ok(batchIndex > -1);
  assert.ok(manageIndex < settingsIndex);
  assert.ok(settingsIndex < batchIndex);
  assert.ok(html.includes('menuSettingsPanel'));
  assert.ok(html.includes('menuManagePanel'));
  assert.ok(html.includes('menuBatchPanel'));
});

test('菜单管理内层tab顺序应为菜单管理、基本设置、批量改价', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const manageIndex = html.indexOf('id="menuInnerTabManageBtn"');
  const settingsIndex = html.indexOf('id="menuInnerTabSettingsBtn"');
  const batchIndex = html.indexOf('id="menuInnerTabBatchBtn"');

  assert.ok(manageIndex >= 0, '缺少菜单管理 tab');
  assert.ok(settingsIndex >= 0, '缺少基本设置 tab');
  assert.ok(batchIndex >= 0, '缺少批量改价 tab');
  assert.ok(manageIndex < settingsIndex, '菜单管理应排在基本设置前');
  assert.ok(settingsIndex < batchIndex, '基本设置应排在批量改价前');
});

test('基础设置应包含设备语言与币种配置输入，且不再显示顶部语言切换', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(!html.includes('id="langSelector"'));
  assert.ok(!html.includes('aria-label="平台语言"'));
  assert.ok(html.includes('id="deviceLangs"'));
  assert.ok(!html.includes('id="platformLangSelector"'));
  assert.ok(html.includes('id="globalCurrencySelect"'));
  assert.ok(!html.includes('id="globalTaxEnabled"'));
  assert.ok(!html.includes('id="globalTaxRate"'));
});

test('各页面头部不应再显示语言切换控件', () => {
  const files = ['menu-management.html', 'menu.html', 'overview.html', 'devices.html', 'orders.html', 'materials.html'];
  files.forEach(file => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(!html.includes('aria-label="平台语言"'), `${file} 仍包含平台语言切换`);
    assert.ok(!html.includes('id="langSelector"'), `${file} 仍包含 langSelector`);
    assert.ok(!html.includes('class="platform-lang-selector"'), `${file} 仍包含 platform-lang-selector`);
  });
});

test('基础设置不应再保留税率相关样式', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(!html.includes('.settings-tax-row'));
  assert.ok(!html.includes('.settings-tax-input-wrap'));
  assert.ok(!html.includes('.settings-tax-input'));
});

test('基础设置：应仅保留售价币种卡片，不再展示税率设置卡片', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/<section class="settings-card(?:[^>]*)>[\s\S]*?<h3 class="settings-title">售价币种<\/h3>[\s\S]*?id="globalCurrencySelect"[\s\S]*?<\/section>/.test(html));
  assert.ok(!html.includes('税率设置'));
  assert.ok(!html.includes('globalTaxEnabled'));
  assert.ok(!html.includes('globalTaxRate'));
});

test('基础设置：应新增当前设备点单屏联系信息卡片并标注设备作用域', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('点单屏联系信息'));
  assert.ok(html.includes('id="orderContactPhoneInput"'));
  assert.ok(html.includes('id="orderContactEmailInput"'));
  assert.ok(html.includes('id="orderContactScopeSummary"'));
  assert.ok(html.includes('id="orderContactStatusText"'));
  assert.ok(html.includes('当前设备生效'));
});

test('基础设置：桌面端设置卡片应改为两列布局，避免四张卡片横向挤压', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.settings-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(html));
  assert.ok(!/\.settings-card-contact\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/.test(html));
});

test('基础设置：语言卡片应保留顶部编辑入口和语言列表，但不显示卡片内设备编号', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const langCardMatch = html.match(/<section class="settings-card settings-card-language">[\s\S]*?<div class="settings-card-head">[\s\S]*?>编辑<\/button>[\s\S]*?<div class="settings-device-summary">[\s\S]*?id="deviceLangs"[\s\S]*?<\/section>/);
  assert.ok(langCardMatch, '语言卡片未保留顶部编辑入口和语言列表布局');
  assert.ok(!html.includes('id="settingsDeviceTag"'));
});

test('基础设置：语言卡片应在等高布局下使用紧凑纵向 flex 排布', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.settings-card-language\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*\}/.test(html));
  assert.ok(/\.settings-device-summary\s*\{[^}]*justify-content:\s*center;[^}]*\}/.test(html));
});

test('基础设置：商品弹窗价格规则提示不应再提到税率', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="productPricingRuleHint"'));
  assert.ok(!html.includes('采用“基本设置”中的币种与税率'));
  assert.ok(!html.includes('税率'));
});

test('基础设置：语言卡片不应展示默认点单屏语言和已启用语言数量摘要', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(!html.includes('id="settingsDefaultOrderPreviewLang"'));
  assert.ok(!html.includes('id="settingsVisibleLangCount"'));
});

test('按钮归属：预览点单屏在基本设置tab，新增分类不在基本设置tab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const settingsPanelMatch = html.match(/<div id="menuSettingsPanel"[\s\S]*?<div id="menuManagePanel"/);
  assert.ok(settingsPanelMatch, '未找到基本设置面板片段');

  const settingsPanelHtml = settingsPanelMatch[0];
  assert.ok(settingsPanelHtml.includes('openOrderPreviewModal()'), '基本设置中缺少预览点单屏按钮');
  assert.ok(!settingsPanelHtml.includes('openCategoryModal()'), '基本设置中不应出现新增分类按钮');
});

test('按钮归属：新增分类按钮应只保留在菜单管理工作区，不在顶部操作区', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const headerMatch = html.match(/<div class="header-right">[\s\S]*?<\/div>\s*<\/header>/);
  assert.ok(headerMatch, '未找到顶部操作区片段');
  assert.ok(!/header-manage-action[^>]*openCategoryModal\(\)/.test(headerMatch[0]), '顶部操作区不应保留新增分类按钮');
  assert.ok(!/header-manage-action[^>]*openCopyProductModal\(\)/.test(headerMatch[0]), '顶部操作区不应保留复制商品按钮');
  const managePanelMatch = html.match(/<div id="menuManagePanel"[\s\S]*?<div id="menuBatchPanel"/);
  assert.ok(managePanelMatch, '未找到菜单管理面板');
  assert.ok(managePanelMatch[0].includes('openCategoryModal()'), '菜单管理工作区缺少新增分类按钮');
});

test('移动端商品管理页不应重复显示顶部导航标题和内容区大标题', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/class="mobile-header-title"/.test(html), '移动端顶部缺少独立标题节点');
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.header-title\s*\{[^}]*display:\s*none;[^}]*\}[\s\S]*\.header-title-wrapper\s*\{[^}]*gap:\s*0;/.test(html), '移动端应隐藏重复的大标题并压缩标题区间距');
});

test('菜单管理：应改为分类导航和商品工作区布局，并提供共享筛选入口', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="menuSharedContext"'));
  assert.ok(html.includes('id="menuManageWorkspace"'));
  assert.ok(html.includes('id="menuManageCategoryList"'));
  assert.ok(html.includes('id="menuSharedClearBtn"'));
  assert.ok(!html.includes('id="menuManageCategoryKeyword"'));
  assert.ok(html.includes('id="menuManageCategorySelect"'));
  assert.ok(html.includes('id="menuManageProductKeyword"'));
  assert.ok(html.includes('class="menu-manage-scope-toggle"'));
  assert.ok(html.includes('id="menuManageScopeCurrentBtn"'));
  assert.ok(html.includes('id="menuManageScopeAllBtn"'));
  assert.ok(!html.includes('id="menuManageScopeSelect"'));
  assert.ok(html.includes('setMenuSharedProductKeyword(this.value)'));
});

test('菜单管理：左侧分类导航不应再展示说明文案与分类搜索框', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('class="menu-manage-sidebar-title">分类导航'));
  assert.ok(!html.includes('menu-manage-sidebar-desc'));
  assert.ok(!html.includes('搜索分类'));
  assert.ok(!html.includes('输入分类名称'));
});

test('菜单管理工作区：桌面端工具栏应分组布局，商品网格不应固定 5 列', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('class="menu-shared-context-controls"'));
  assert.ok(html.includes('class="menu-manage-toolbar-actions"'));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-toolbar\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(220px,\s*260px\)\s+minmax\(0,\s*1fr\);[^}]*\}/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-toolbar-actions\s*\{[^}]*display:\s*inline-flex;[^}]*\}/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-toolbar-actions\s*\{[^}]*justify-self:\s*end;[^}]*\}/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-content\s+\.product-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(240px,\s*1fr\)\);[^}]*\}/.test(html));
  assert.ok(!/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-content\s+\.product-grid\s*\{[^}]*repeat\(5,/.test(html));
});

test('菜单管理工作区：桌面端操作按钮应保持紧凑宽度并右对齐', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.menu-manage-toolbar-actions\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*flex-end;/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-toolbar-actions\s*\{[^}]*display:\s*inline-flex;[^}]*\}/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-toolbar-actions\s*\{[^}]*justify-self:\s*end;[^}]*\}/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-toolbar-actions\s+\.btn\s*\{[^}]*width:\s*auto;[^}]*\}/.test(html));
});

test('共享上下文：应位于菜单 tab 上方，并包含分类、商品搜索与清空入口', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const menuViewMatch = html.match(/<div id="menuView"[\s\S]*?<\/div>\s*<\/div>\s*<\/main>/);
  assert.ok(menuViewMatch, '未找到菜单视图片区块');
  const menuViewHtml = menuViewMatch[0];
  const tabsIndex = menuViewHtml.indexOf('class="menu-inner-tabs"');
  assert.ok(tabsIndex > -1, '缺少菜单tab');
  assert.ok(!menuViewHtml.includes('>共享上下文<'));
  assert.ok(!menuViewHtml.includes('上述条件会同时作用于「商品管理」和「批量改价」'));
  assert.ok(menuViewHtml.includes('id="menuManageCategorySelect"'));
  assert.ok(menuViewHtml.includes('id="menuManageCategoryMobileTrigger"'));
  assert.ok(menuViewHtml.includes('id="menuSharedMobileCategorySheet"'));
  assert.ok(menuViewHtml.includes('id="menuManageProductKeyword"'));
  assert.ok(menuViewHtml.includes('id="menuSharedClearBtn"'));
});

test('共享上下文：应通过工作区插槽下移到统计卡片下方，并在批量改价区保留独立插槽', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="menuManageSharedContextSlot"'));
  assert.ok(html.includes('id="menuBatchSharedContextSlot"'));

  const managePanelMatch = html.match(/<div id="menuManagePanel"[\s\S]*?<div id="menuBatchPanel"/);
  assert.ok(managePanelMatch, '未找到菜单管理面板');
  const managePanelHtml = managePanelMatch[0];
  assert.ok(managePanelHtml.indexOf('class="stats-bar"') < managePanelHtml.indexOf('id="menuManageSharedContextSlot"'));
  assert.ok(managePanelHtml.indexOf('id="menuManageSharedContextSlot"') < managePanelHtml.indexOf('id="menuManageWorkspace"'));

  const batchPanelMatch = html.match(/<div id="menuBatchPanel"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
  assert.ok(batchPanelMatch, '未找到批量改价面板');
  const batchPanelHtml = batchPanelMatch[0];
  assert.ok(batchPanelHtml.indexOf('id="menuBatchSharedContextSlot"') < batchPanelHtml.indexOf('id="batchFixedPricePanel"'));
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

test('菜单管理页初始化时默认应打开菜单管理tab', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu';
  assert.strictEqual(typeof ctx.init, 'function');
  ctx.init();

  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), false);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabBatchBtn').classList.contains('active'), false);
});

test('菜单管理页初始化时应支持通过 innerTab 参数选中基本设置', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu&innerTab=settings';
  ctx.init();

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

test('菜单管理页初始化时无 innerTab 参数应默认打开菜单管理', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu';
  ctx.init();

  assert.strictEqual(ctx.currentMenuInnerTab, 'manage');
  assert.strictEqual(ctx.document.getElementById('menuInnerTabManageBtn').classList.contains('active'), true);
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), false);
});

test('菜单管理页初始化时应支持通过 innerTab 参数选中基本设置', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu&innerTab=settings';
  ctx.init();

  assert.strictEqual(ctx.currentMenuInnerTab, 'settings');
  assert.strictEqual(ctx.document.getElementById('menuInnerTabSettingsBtn').classList.contains('active'), true);
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
  assert.ok(Array.isArray(payload.categoryOptions));
  assert.ok(payload.categoryOptions.length > 0);
});

test('跳转商品详情时应保存当前商品管理筛选条件与滚动位置', () => {
  const ctx = loadMenuContext();
  ctx.currentDevice = 'RCK112';
  ctx.currentMenuInnerTab = 'manage';
  ctx.menuSharedCategoryFilter = '奶咖系列';
  ctx.menuManageActiveCategory = '奶咖系列';
  ctx.menuManageProductKeyword = '拿铁';
  ctx.menuManageProductScope = 'all';
  ctx.window.scrollY = 480;

  ctx.goToDetail(2);

  const raw = ctx.sessionStorage.getItem('menuManagementReturnState');
  assert.ok(raw, '会话存储中缺少返回列表上下文');
  const state = JSON.parse(raw);
  assert.strictEqual(state.device, 'RCK112');
  assert.strictEqual(state.tab, 'menu');
  assert.strictEqual(state.innerTab, 'manage');
  assert.strictEqual(state.categoryFilter, '奶咖系列');
  assert.strictEqual(state.activeCategory, '奶咖系列');
  assert.strictEqual(state.productKeyword, '拿铁');
  assert.strictEqual(state.productScope, 'all');
  assert.strictEqual(state.scrollY, 480);
});

test('设备搜索：应支持按点位名称匹配设备并展示“点位名称 · 设备编号”', () => {
  const ctx = loadMenuContext();
  ctx.localStorage.setItem('devicesData', JSON.stringify([
    { id: 'RCK111', location: 'k1001', entered: true, entryInfo: { locationName: '上海国家会展中心A馆' } },
    { id: 'RCK112', location: 'k1002', entered: true, entryInfo: { locationName: '北京朝阳门店' } }
  ]));
  ctx.localStorage.setItem('locationsData', JSON.stringify([
    { code: 'k1001', name: '上海国家会展中心A馆' },
    { code: 'k1002', name: '北京朝阳门店' }
  ]));

  ctx.initDeviceSearch();

  assert.strictEqual(ctx.document.getElementById('deviceSearchInput').value, '上海国家会展中心A馆 · RCK111');
  assert.strictEqual(ctx.matchDeviceByInput('上海国家会展中心A馆'), 'RCK111');
  assert.strictEqual(ctx.matchDeviceByInput('北京朝阳'), 'RCK112');

  ctx.renderDeviceDropdown('上海国家');
  const dropdownHtml = ctx.document.getElementById('deviceDropdown').innerHTML;
  assert.ok(dropdownHtml.includes('上海国家会展中心A馆'));
  assert.ok(dropdownHtml.includes('RCK111'));

  ctx.document.getElementById('deviceSearchInput').value = '北京朝阳门店';
  ctx.changeDeviceByInput();

  assert.strictEqual(ctx.currentDevice, 'RCK112');
  assert.strictEqual(ctx.document.getElementById('deviceSearchInput').value, '北京朝阳门店 · RCK112');
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
  assert.ok(Array.isArray(wrapped.payload.categoryOptions));
  assert.ok(wrapped.payload.categoryOptions.length > 0);
  assert.ok(wrapped.payloadKey);
  assert.ok(!ctx.window.location.href.includes('product='));
  assert.ok(!ctx.window.location.href.includes('category='));
});

test('菜单管理页初始化时应恢复详情返回前的筛选条件与滚动位置', () => {
  const ctx = loadMenuContext();
  const returnDeviceId = getSharedRuntimeDeviceIds(ctx)[1] || getSharedRuntimeDeviceIds(ctx)[0];
  ctx.window.location.search = '?tab=menu&innerTab=manage';
  ctx.sessionStorage.setItem('menuManagementReturnState', JSON.stringify({
    device: returnDeviceId,
    tab: 'menu',
    innerTab: 'manage',
    categoryFilter: '奶咖系列',
    activeCategory: '奶咖系列',
    productKeyword: '拿铁',
    productScope: 'all',
    scrollY: 480
  }));

  ctx.init();

  assert.strictEqual(ctx.currentDevice, returnDeviceId);
  assert.strictEqual(ctx.currentTab, 'menu');
  assert.strictEqual(ctx.currentMenuInnerTab, 'manage');
  assert.strictEqual(ctx.menuSharedCategoryFilter, '奶咖系列');
  assert.strictEqual(ctx.menuManageActiveCategory, '奶咖系列');
  assert.strictEqual(ctx.menuManageProductKeyword, '拿铁');
  assert.strictEqual(ctx.menuManageProductScope, 'all');
  assert.strictEqual(ctx.batchFixedPriceKeyword, '拿铁');
  assert.strictEqual(ctx.document.getElementById('menuManageProductKeyword').value, '拿铁');
  assert.deepStrictEqual(ctx.window.__lastScrollTo, { top: 480, behavior: 'auto' });
  assert.strictEqual(ctx.sessionStorage.getItem('menuManagementReturnState'), null);
});

test('菜单管理页初始化时应支持通过 URL 参数自动打开点单屏预览', () => {
  const ctx = loadMenuContext();
  let previewOpenCount = 0;
  ctx.openOrderPreviewModal = () => {
    previewOpenCount += 1;
  };
  ctx.window.location.search = '?tab=menu&innerTab=manage&openOrderPreview=1';

  ctx.init();

  assert.strictEqual(previewOpenCount, 1);
});

test('菜单管理页初始化时应支持嵌入式点单屏预览模式', () => {
  const ctx = loadMenuContext();
  let previewOpenCount = 0;
  ctx.openOrderPreviewModal = () => {
    previewOpenCount += 1;
  };
  ctx.window.location.search = '?tab=menu&innerTab=manage&openOrderPreview=1&embedOrderPreview=1';

  ctx.init();

  assert.strictEqual(previewOpenCount, 1);
  assert.ok(ctx.document.body.classList.contains('embedded-order-preview-mode'));
});

test('嵌入式点单屏预览应支持接收详情页基础信息草稿并覆盖预览展示', () => {
  const ctx = loadMenuContext();
  ctx.window.location.search = '?tab=menu&innerTab=manage&openOrderPreview=1&embedOrderPreview=1';

  ctx.init();

  const firstCategory = ctx.getOrderPreviewCategoryEntries().find(entry => entry.items.length > 0);
  assert.ok(firstCategory);
  const firstProduct = firstCategory.items[0];
  assert.ok(firstProduct);

  ctx.dispatchWindowMessage({
    type: 'orderPreviewDraftPayload',
    payload: {
      productId: Number(firstProduct.id),
      names: { zh: '临时点单名' },
      descs: { zh: '临时点单描述' },
      image: 'https://example.com/draft.png',
      price: 66.6,
      originalPrice: 88.8,
      onSale: true
    }
  });

  const productsHtml = ctx.document.getElementById('orderPreviewProducts').innerHTML;

  assert.ok(productsHtml.includes('临时点单名'));
  assert.ok(productsHtml.includes('临时点单描述'));
  assert.ok(productsHtml.includes('66.60'));
  assert.ok(productsHtml.includes('88.80'));
  assert.ok(productsHtml.includes('https://example.com/draft.png'));
});

test('菜单管理页初始化时应消费详情页返回的复制结果并清空暂存', () => {
  const ctx = loadMenuContext();
  const pendingResults = [
    { deviceId: 'RCK112', status: 'success', message: '商品ID 88' },
    { deviceId: 'RCK113', status: 'failed', message: '缺少分类：新品' }
  ];
  let receivedResults = null;
  ctx.localStorage.setItem('menuCopyProductPendingResults', JSON.stringify(pendingResults));
  ctx.openCopyProductBatchResultModal = (results) => {
    receivedResults = JSON.parse(JSON.stringify(results));
  };

  ctx.init();

  assert.deepStrictEqual(receivedResults, pendingResults);
  assert.strictEqual(ctx.localStorage.getItem('menuCopyProductPendingResults'), null);
});

test('菜单管理页初始化时应同步详情页复制后的下一个商品ID计数', () => {
  const ctx = loadMenuContext();
  ctx.localStorage.setItem('menuNextProductId', '88');

  ctx.init();

  assert.strictEqual(ctx.nextProductId, 88);
});

test('菜单管理：应根据本地商品分类归属将同一商品挂载到多个分类', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    A: {
      names: { zh: '分类A' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' } }]
    },
    B: {
      names: { zh: '分类B' },
      items: []
    },
    C: {
      names: { zh: '分类C' },
      items: [{ id: 1, price: 10, originalPrice: 12, names: { zh: '商品1' } }]
    }
  };

  ctx.localStorage.setItem('menuProductCategoryAssignments', JSON.stringify({
    1: ['A', 'B']
  }));

  assert.strictEqual(typeof ctx.applySavedProductCategoryAssignments, 'function');
  ctx.applySavedProductCategoryAssignments();

  assert.strictEqual(ctx.productsData.A.items.filter(item => item.id === 1).length, 1);
  assert.strictEqual(ctx.productsData.B.items.filter(item => item.id === 1).length, 1);
  assert.strictEqual(ctx.productsData.C.items.filter(item => item.id === 1).length, 0);
});

test('菜单管理工作区：默认仅展示当前分类商品，并同步分类导航与移动端分类选择', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    拉花: {
      icon: '☕',
      names: { zh: '拉花' },
      items: [{ id: 1, price: 10, names: { zh: '干卡布其诺' }, onSale: true }]
    },
    新品: {
      icon: '🆕',
      names: { zh: '新品' },
      items: [{ id: 2, price: 12, names: { zh: '橘皮拿铁' }, onSale: true }]
    }
  };

  ctx.switchMenuInnerTab('manage');
  assert.strictEqual(typeof ctx.setMenuManageActiveCategory, 'function');
  ctx.setMenuManageActiveCategory('新品');

  const workspaceHtml = ctx.document.getElementById('categoriesContainer').innerHTML;
  const categoryNavHtml = ctx.document.getElementById('menuManageCategoryList').innerHTML;
  const mobileSelectHtml = ctx.document.getElementById('menuManageCategorySelect').innerHTML;

  assert.ok(workspaceHtml.includes('橘皮拿铁'));
  assert.ok(!workspaceHtml.includes('干卡布其诺'));
  assert.ok(categoryNavHtml.includes('拉花'));
  assert.ok(categoryNavHtml.includes('新品'));
  assert.ok(mobileSelectHtml.includes('value="__ALL__"'));
  assert.ok(mobileSelectHtml.includes('value=\"拉花\"'));
  assert.ok(mobileSelectHtml.includes('value=\"新品\"'));
  assert.ok(mobileSelectHtml.includes('全部分类'));
  assert.ok(mobileSelectHtml.includes('拉花（1个商品）'));
  assert.ok(mobileSelectHtml.includes('新品（1个商品）'));
  assert.strictEqual(ctx.document.getElementById('menuManageCategorySelect').value, '新品');
});

test('菜单管理分类导航：桌面端应移除数量徽标，并允许分类名完整换行显示', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.menu-manage-category-item-name\s*\{[\s\S]*white-space:\s*normal;/.test(html));
  assert.ok(!html.includes('menu-manage-category-item-count'));
  assert.ok(!html.includes('class="menu-manage-category-item-meta"'));
});

test('菜单管理分类导航：桌面端分类行应恢复垂直居中对齐', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.menu-manage-category-item-select\s*\{[\s\S]*align-items:\s*center;/.test(html));
  assert.ok(/\.menu-manage-category-item-actions\s*\{[\s\S]*align-items:\s*center;/.test(html));
  assert.ok(/\.drag-handle\s*\{[\s\S]*margin-top:\s*0;/.test(html));
});

test('菜单管理商品卡片：应统一提供上下架与编辑双按钮', () => {
  const ctx = loadMenuContext();
  const onSaleProduct = {
    id: 2,
    price: 10,
    originalPrice: null,
    onSale: true,
    featured: false,
    names: { zh: '卡布其诺*' },
    descs: { zh: '金奖黑咖-浓香意式、热、标准' }
  };
  const offSaleProduct = {
    ...onSaleProduct,
    id: 3,
    onSale: false
  };

  const onSaleHtml = ctx.renderMenuManageProductCard(onSaleProduct, { categoryKey: '奶咖系列' });
  const offSaleHtml = ctx.renderMenuManageProductCard(offSaleProduct, { categoryKey: '奶咖系列' });

  assert.ok(onSaleHtml.includes('>下架<'));
  assert.ok(onSaleHtml.includes('>编辑<'));
  assert.ok(onSaleHtml.includes('<div class="product-card product-row">'));
  assert.ok(!onSaleHtml.includes('<div class="product-card product-row" onclick="goToDetail('));
  assert.ok(onSaleHtml.includes("event.stopPropagation(); toggleProductSale('奶咖系列', 2)"));
  assert.ok(onSaleHtml.includes("event.stopPropagation(); goToDetail(2)"));
  assert.ok(offSaleHtml.includes('>上架<'));
});

test('菜单管理商品卡片：桌面端 footer 不应横向挤压价格区', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/\.product-price-single\s*\{[\s\S]*white-space:\s*nowrap;/.test(html));
  assert.ok(/\.product-card\.product-row\s+\.product-footer\s*\{[\s\S]*flex-direction:\s*column;[\s\S]*align-items:\s*stretch;/.test(html));
  assert.ok(/\.product-card\.product-row\s+\.product-actions\s*\{[\s\S]*width:\s*100%;[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(html));
});

test('菜单管理商品卡片：上架和下架按钮应使用不同状态色', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/\.product-action-btn-sale-on\s*\{[\s\S]*color:\s*#15803d;[\s\S]*background:\s*#dcfce7;/.test(html));
  assert.ok(/\.product-action-btn-sale-off\s*\{[\s\S]*color:\s*#c2410c;[\s\S]*background:\s*#ffedd5;/.test(html));
  assert.ok(/saleActionClass\s*=\s*isOnSale\s*\?\s*'product-action-btn-sale-off'\s*:\s*'product-action-btn-sale-on'/.test(html));
});

test('菜单管理商品卡片：业务标签应悬浮在商品图右上角，不占用正文布局', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'zh';
  ctx.window.COFE_SHARED_MOCK_DATA.defaultBusinessTags = {
    tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' },
    tag_recommend: { id: 'tag_recommend', names: { zh: '推荐', en: 'Recommend' }, status: 'active' }
  };
  const product = {
    id: 9,
    price: 10,
    onSale: true,
    names: { zh: '卡布其诺*' },
    descs: { zh: '金奖黑咖-浓香意式、热、标准' },
    businessTagIds: ['tag_signature', 'tag_recommend']
  };

  const cardHtml = ctx.renderMenuManageProductCard(product, { categoryKey: '奶咖系列' });
  const source = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');

  assert.ok(/<div class="product-image-wrapper">[\s\S]*product-business-tag-list product-business-tag-list-overlay/.test(cardHtml));
  assert.ok(!/<div class="product-content">[\s\S]*product-business-tag-list/.test(cardHtml));
  assert.ok(/\.product-business-tag-list-overlay\s*\{[\s\S]*position:\s*absolute;[\s\S]*top:\s*12px;[\s\S]*right:\s*12px;/.test(source));
});

test('菜单管理工作区：当前分类模式应提供调整商品顺序入口，全部分类模式不显示', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    经典咖啡: {
      icon: '☕',
      names: { zh: '经典咖啡' },
      items: [
        { id: 1, price: 12.9, names: { zh: '经典美式' }, onSale: true },
        { id: 2, price: 14.9, names: { zh: '榛果美式' }, onSale: true }
      ]
    },
    新品推荐: {
      icon: '🆕',
      names: { zh: '新品推荐' },
      items: [
        { id: 3, price: 16.9, names: { zh: '橘皮拿铁' }, onSale: true }
      ]
    }
  };
  ctx.menuManageActiveCategory = '经典咖啡';
  ctx.menuSharedCategoryFilter = '经典咖啡';
  ctx.menuManageProductScope = 'current';

  ctx.renderMenu();
  assert.ok(ctx.document.getElementById('categoriesContainer').innerHTML.includes('调整商品顺序'));

  ctx.setMenuManageProductScope('all');
  assert.ok(!ctx.document.getElementById('categoriesContainer').innerHTML.includes('调整商品顺序'));
});

test('菜单管理工作区：保存当前分类商品顺序时不应影响其他分类', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    经典咖啡: {
      icon: '☕',
      names: { zh: '经典咖啡' },
      items: [
        { id: 1, price: 12.9, names: { zh: '经典美式' }, onSale: true },
        { id: 2, price: 14.9, names: { zh: '榛果美式' }, onSale: true },
        { id: 3, price: 15.9, names: { zh: '厚乳黑咖' }, onSale: true }
      ]
    },
    新品推荐: {
      icon: '🆕',
      names: { zh: '新品推荐' },
      items: [
        { id: 3, price: 15.9, names: { zh: '厚乳黑咖' }, onSale: true },
        { id: 1, price: 12.9, names: { zh: '经典美式' }, onSale: true }
      ]
    }
  };
  ctx.menuManageActiveCategory = '经典咖啡';
  ctx.menuSharedCategoryFilter = '经典咖啡';
  ctx.menuManageProductScope = 'current';

  ctx.enterMenuManageProductSortMode();
  ctx.setMenuManageProductSortDraftOrder([3, 1, 2]);
  ctx.saveMenuManageProductSortOrder();

  assert.deepStrictEqual(Array.from(ctx.productsData.经典咖啡.items, item => item.id), [3, 1, 2]);
  assert.deepStrictEqual(Array.from(ctx.productsData.新品推荐.items, item => item.id), [3, 1]);
});

test('菜单管理工作区：桌面端排序草稿变化后应立即刷新当前排序列表', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    经典咖啡: {
      icon: '☕',
      names: { zh: '经典咖啡' },
      items: [
        { id: 1, price: 12.9, names: { zh: '经典美式' }, onSale: true },
        { id: 2, price: 14.9, names: { zh: '榛果美式' }, onSale: true },
        { id: 3, price: 15.9, names: { zh: '厚乳黑咖' }, onSale: true }
      ]
    }
  };
  ctx.menuManageActiveCategory = '经典咖啡';
  ctx.menuSharedCategoryFilter = '经典咖啡';
  ctx.menuManageProductScope = 'current';
  ctx.window.innerWidth = 1280;

  ctx.enterMenuManageProductSortMode();
  ctx.setMenuManageProductSortDraftOrder([3, 1, 2]);

  const workspaceHtml = ctx.document.getElementById('categoriesContainer').innerHTML;
  const thickMilkIndex = workspaceHtml.indexOf('厚乳黑咖');
  const classicIndex = workspaceHtml.indexOf('经典美式');
  const hazelnutIndex = workspaceHtml.indexOf('榛果美式');

  assert.ok(thickMilkIndex !== -1 && classicIndex !== -1 && hazelnutIndex !== -1);
  assert.ok(thickMilkIndex < classicIndex);
  assert.ok(classicIndex < hazelnutIndex);
});

test('菜单管理工作区：全部分类搜索结果应按商品ID去重且不展示分类标签', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    经典咖啡: {
      icon: '☕',
      names: { zh: '经典咖啡' },
      items: [{ id: 1, price: 10, names: { zh: '拿铁' }, onSale: true }]
    },
    新品推荐: {
      icon: '🆕',
      names: { zh: '新品推荐' },
      items: [
        { id: 1, price: 10, names: { zh: '拿铁' }, onSale: true },
        { id: 2, price: 13, names: { zh: '美式' }, onSale: true }
      ]
    }
  };

  ctx.switchMenuInnerTab('manage');
  assert.strictEqual(typeof ctx.setMenuManageProductScope, 'function');
  ctx.setMenuManageProductScope('all');
  ctx.setMenuManageProductKeyword('拿铁');

  const workspaceHtml = ctx.document.getElementById('categoriesContainer').innerHTML;
  assert.strictEqual((workspaceHtml.match(/拿铁/g) || []).length, 1);
  assert.ok(!workspaceHtml.includes('美式'));
  assert.ok(!workspaceHtml.includes('menu-manage-search-tags'));
  assert.ok(!workspaceHtml.includes('menu-manage-search-tag'));
  assert.ok(workspaceHtml.includes('按商品 ID 去重展示，避免多分类商品重复出现。'));
});

test('菜单管理工作区：搜索范围应使用分段切换并同步选中态', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;

  ctx.switchMenuInnerTab('manage');

  const currentBtn = ctx.document.getElementById('menuManageScopeCurrentBtn');
  const allBtn = ctx.document.getElementById('menuManageScopeAllBtn');

  assert.ok(currentBtn.classList.contains('active'));
  assert.ok(!allBtn.classList.contains('active'));

  ctx.setMenuManageProductScope('all');

  assert.ok(!currentBtn.classList.contains('active'));
  assert.ok(allBtn.classList.contains('active'));
});

test('共享上下文：切换商品管理和批量改价时应复用同一分类与商品搜索条件', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    奶咖系列: {
      icon: '☕',
      names: { zh: '奶咖系列' },
      items: [
        { id: 1, price: 18, originalPrice: 22, names: { zh: '生椰拿铁' }, onSale: true },
        { id: 2, price: 16, originalPrice: 20, names: { zh: '榛果拿铁' }, onSale: true }
      ]
    },
    精品咖啡: {
      icon: '⭐',
      names: { zh: '精品咖啡' },
      items: [
        { id: 3, price: 14, originalPrice: 18, names: { zh: '冷萃美式' }, onSale: true }
      ]
    }
  };

  ctx.switchMenuInnerTab('manage');
  ctx.setMenuSharedCategoryFilter('奶咖系列');
  ctx.setMenuSharedProductKeyword('拿铁');

  assert.strictEqual(ctx.document.getElementById('menuManageCategorySelect').value, '奶咖系列');
  assert.strictEqual(ctx.document.getElementById('menuManageProductKeyword').value, '拿铁');

  ctx.switchMenuInnerTab('batch');

  const summaryText = ctx.document.getElementById('batchFixedContextSummary').textContent;
  const listHtml = ctx.document.getElementById('batchFixedListContainer').innerHTML;
  assert.ok(summaryText.includes('奶咖系列'));
  assert.ok(summaryText.includes('拿铁'));
  assert.ok(listHtml.includes('生椰拿铁'));
  assert.ok(listHtml.includes('榛果拿铁'));
  assert.ok(!listHtml.includes('冷萃美式'));
});

test('共享上下文：切换 tab 时应移动到对应插槽，并在基本设置下隐藏以避免顶部跳动', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;

  ctx.switchMenuInnerTab('manage');
  assert.strictEqual(ctx.document.getElementById('menuSharedContext').parentNode.id, 'menuManageSharedContextSlot');
  assert.notStrictEqual(ctx.document.getElementById('menuSharedContext').style.display, 'none');

  ctx.switchMenuInnerTab('batch');
  assert.strictEqual(ctx.document.getElementById('menuSharedContext').parentNode.id, 'menuBatchSharedContextSlot');
  assert.notStrictEqual(ctx.document.getElementById('menuSharedContext').style.display, 'none');

  ctx.switchMenuInnerTab('settings');
  assert.strictEqual(ctx.document.getElementById('menuSharedContext').style.display, 'none');
});

test('共享上下文：清空后应恢复默认分类并清除商品搜索条件', () => {
  const ctx = loadMenuContext();
  ctx.renderMenu = ctx.__realRenderMenu;
  ctx.productsData = {
    奶咖系列: {
      icon: '☕',
      names: { zh: '奶咖系列' },
      items: [{ id: 1, price: 18, originalPrice: 22, names: { zh: '生椰拿铁' }, onSale: true }]
    },
    精品咖啡: {
      icon: '⭐',
      names: { zh: '精品咖啡' },
      items: [{ id: 2, price: 14, originalPrice: 18, names: { zh: '冷萃美式' }, onSale: true }]
    }
  };

  ctx.switchMenuInnerTab('manage');
  ctx.setMenuSharedCategoryFilter('精品咖啡');
  ctx.setMenuSharedProductKeyword('冷萃');

  ctx.clearMenuSharedFilters();

  assert.strictEqual(ctx.document.getElementById('menuManageCategorySelect').value, '奶咖系列');
  assert.strictEqual(ctx.document.getElementById('menuManageProductKeyword').value, '');
});

test('保存基础设置后，应仅将币种应用到菜单商品并忽略税率旧字段', () => {
  const ctx = loadMenuContext();
  ctx.document.getElementById('globalCurrencySelect').value = 'USD';
  ctx.localStorage.setItem('menuBasicSettings', JSON.stringify({
    currency: 'CNY',
    taxEnabled: true,
    taxRate: 0.1
  }));

  ctx.saveMenuBasicSettings();

  const saved = JSON.parse(ctx.localStorage.getItem('menuBasicSettings'));
  assert.strictEqual(saved.currency, 'USD');
  assert.ok(!Object.prototype.hasOwnProperty.call(saved, 'taxEnabled'));
  assert.ok(!Object.prototype.hasOwnProperty.call(saved, 'taxRate'));

  const anyItem = Object.values(ctx.productsData)[0].items[0];
  assert.strictEqual(anyItem.currency, 'USD');
  assert.ok(!Object.prototype.hasOwnProperty.call(anyItem, 'taxEnabled'));
  assert.ok(!Object.prototype.hasOwnProperty.call(anyItem, 'taxRate'));
});

test('保存基础设置后，应将当前设备联系信息保存到独立存储键并刷新已打开预览', () => {
  const ctx = loadMenuContext();
  const toastMessages = [];
  ctx.showToast = (message, type) => {
    toastMessages.push(`${type || 'success'}:${message}`);
  };

  ctx.renderMenuBasicSettingsForm();
  ctx.openOrderPreviewModal();
  ctx.document.getElementById('orderContactPhoneInput').value = ' 400-800-1234 ';
  ctx.document.getElementById('orderContactEmailInput').value = ' support@example.com ';
  ctx.document.getElementById('globalCurrencySelect').value = 'USD';

  ctx.saveMenuBasicSettings();

  const saved = JSON.parse(ctx.localStorage.getItem(`deviceOrderContactConfig_${ctx.currentDevice}`) || '{}');
  assert.strictEqual(saved.phone, '400-800-1234');
  assert.strictEqual(saved.email, 'support@example.com');
  assert.strictEqual(ctx.localStorage.getItem(`deviceLanguageConfig_${ctx.currentDevice}`), null);
  assert.ok(ctx.document.getElementById('orderPreviewProducts').innerHTML.includes('400-800-1234'));
  assert.ok(ctx.document.getElementById('orderPreviewProducts').innerHTML.includes('support@example.com'));
  assert.ok(toastMessages.some(message => message.includes('基础设置已保存')));
});

test('基础设置：非法邮箱应阻止保存联系信息', () => {
  const ctx = loadMenuContext();
  let toastMessage = '';
  ctx.showToast = (message, type) => {
    toastMessage = `${type || 'success'}:${message}`;
  };

  ctx.renderMenuBasicSettingsForm();
  ctx.document.getElementById('orderContactPhoneInput').value = '400-800-1234';
  ctx.document.getElementById('orderContactEmailInput').value = 'invalid-email';

  ctx.saveMenuBasicSettings();

  assert.strictEqual(toastMessage, 'error:请输入有效的客服邮箱');
  assert.strictEqual(ctx.localStorage.getItem(`deviceOrderContactConfig_${ctx.currentDevice}`), null);
});

test('基础设置：切换设备时若联系信息未保存应支持保存后切换', () => {
  const ctx = loadMenuContext();
  const confirmCalls = [];
  ctx.confirm = (message) => {
    confirmCalls.push(message);
    return confirmCalls.length === 1;
  };
  ctx.showToast = () => {};
  ctx.localStorage.setItem('devicesData', JSON.stringify([
    { id: 'RCK111', location: 'k1001' },
    { id: 'RCK112', location: 'k1002' }
  ]));
  ctx.localStorage.setItem('locationsData', JSON.stringify([
    { code: 'k1001', name: '上海国家会展中心A馆' },
    { code: 'k1002', name: '北京朝阳门店' }
  ]));

  ctx.initDeviceSearch();
  ctx.renderMenuBasicSettingsForm();
  ctx.document.getElementById('orderContactPhoneInput').value = '400-800-5678';
  ctx.document.getElementById('orderContactEmailInput').value = 'save-first@example.com';
  ctx.document.getElementById('deviceSearchInput').value = '北京朝阳门店';

  ctx.changeDeviceByInput();

  assert.strictEqual(ctx.currentDevice, 'RCK112');
  const saved = JSON.parse(ctx.localStorage.getItem('deviceOrderContactConfig_RCK111') || '{}');
  assert.strictEqual(saved.phone, '400-800-5678');
  assert.strictEqual(saved.email, 'save-first@example.com');
  assert.ok(confirmCalls[0].includes('未保存'));
});

test('基础设置：切换设备时若联系信息未保存应支持放弃后切换', () => {
  const ctx = loadMenuContext();
  let confirmCount = 0;
  ctx.confirm = () => {
    confirmCount += 1;
    return confirmCount === 2;
  };
  ctx.showToast = () => {};
  ctx.localStorage.setItem('devicesData', JSON.stringify([
    { id: 'RCK111', location: 'k1001' },
    { id: 'RCK112', location: 'k1002' }
  ]));
  ctx.localStorage.setItem('locationsData', JSON.stringify([
    { code: 'k1001', name: '上海国家会展中心A馆' },
    { code: 'k1002', name: '北京朝阳门店' }
  ]));

  ctx.initDeviceSearch();
  ctx.renderMenuBasicSettingsForm();
  ctx.document.getElementById('orderContactPhoneInput').value = '400-800-5678';
  ctx.document.getElementById('deviceSearchInput').value = '北京朝阳门店';

  ctx.changeDeviceByInput();

  assert.strictEqual(ctx.currentDevice, 'RCK112');
  assert.strictEqual(ctx.localStorage.getItem('deviceOrderContactConfig_RCK111'), null);
});

test('基础设置：切换设备时若联系信息未保存应支持取消留在当前设备', () => {
  const ctx = loadMenuContext();
  ctx.confirm = () => false;
  ctx.showToast = () => {};
  ctx.localStorage.setItem('devicesData', JSON.stringify([
    { id: 'RCK111', location: 'k1001' },
    { id: 'RCK112', location: 'k1002' }
  ]));
  ctx.localStorage.setItem('locationsData', JSON.stringify([
    { code: 'k1001', name: '上海国家会展中心A馆' },
    { code: 'k1002', name: '北京朝阳门店' }
  ]));

  ctx.initDeviceSearch();
  ctx.renderMenuBasicSettingsForm();
  ctx.document.getElementById('orderContactPhoneInput').value = '400-800-5678';
  ctx.document.getElementById('deviceSearchInput').value = '北京朝阳门店';

  ctx.changeDeviceByInput();

  assert.strictEqual(ctx.currentDevice, 'RCK111');
  assert.strictEqual(ctx.document.getElementById('deviceSearchInput').value, '上海国家会展中心A馆 · RCK111');
});

test('点单屏预览：详情浮层应复用当前设备联系信息并在保存后重绘', () => {
  const ctx = loadMenuContext();
  ctx.showToast = () => {};
  ctx.renderMenuBasicSettingsForm();
  ctx.document.getElementById('orderContactPhoneInput').value = '<400-800-9999>';
  ctx.document.getElementById('orderContactEmailInput').value = 'detail@example.com';
  ctx.saveMenuBasicSettings();

  ctx.openOrderPreviewModal();
  ctx.openOrderPreviewProductDetail(1, encodeURIComponent('3D拉花'));

  let overlayHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(overlayHtml.includes('&lt;400-800-9999&gt;'));
  assert.ok(overlayHtml.includes('detail@example.com'));

  ctx.document.getElementById('orderContactPhoneInput').value = '400-800-0000';
  ctx.document.getElementById('orderContactEmailInput').value = '';
  ctx.saveMenuBasicSettings();

  overlayHtml = ctx.document.getElementById('orderPreviewDetailOverlay').innerHTML;
  assert.ok(overlayHtml.includes('400-800-0000'));
  assert.ok(!overlayHtml.includes('detail@example.com'));
});

test('基础设置：损坏的联系信息本地存储应安全回退为空值', () => {
  const ctx = loadMenuContext();
  ctx.localStorage.setItem(`deviceOrderContactConfig_${ctx.currentDevice}`, '{bad json');

  ctx.renderMenuBasicSettingsForm();

  assert.strictEqual(ctx.document.getElementById('orderContactPhoneInput').value, '');
  assert.strictEqual(ctx.document.getElementById('orderContactEmailInput').value, '');
});

test('批量改价应作为第三个tab，且复用共享筛选并保留列表与批量操作区', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('menuInnerTabBatchBtn'), '缺少批量改价tab');
  assert.ok(html.includes('id="menuSharedContext"'), '缺少共享上下文');
  assert.ok(html.includes('id="batchFixedPricePanel"'), '缺少批量固定改价面板');
  assert.ok(html.includes('id="batchFixedListContainer"'), '缺少批量改价列表容器');
  assert.ok(html.includes('id="batchFixedContextSummary"'), '缺少当前共享范围摘要');
  assert.ok(html.includes('id="batchFixedCurrentPrice"'), '缺少现价输入');
  assert.ok(html.includes('id="batchFixedOriginalPrice"'), '缺少原价输入');
  assert.ok(html.includes('id="batchSaleOnBtn"'), '缺少批量上架按钮');
  assert.ok(html.includes('id="batchSaleOffBtn"'), '缺少批量下架按钮');
  assert.ok(html.includes('submitBatchSaleStatusUpdate(true)'), '缺少批量上架动作');
  assert.ok(html.includes('submitBatchSaleStatusUpdate(false)'), '缺少批量下架动作');
  assert.ok(!html.includes('id="batchFixedRetryBtn"'), '不应再展示失败重试按钮');
  assert.ok(!html.includes('id="batchFixedModeBtn"'), '不应保留菜单管理头部批量按钮');
  assert.ok(!html.includes('id="batchFixedCategorySelect"'), '批量改价不应再保留重复分类筛选');
  assert.ok(!html.includes('id="batchFixedKeyword"'), '批量改价不应再保留重复商品搜索');
});

test('批量改价：工作区应展示共享范围摘要和批量编辑区', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const editorGroupMatch = html.match(/<div class="batch-fixed-group batch-fixed-editor-group">[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(editorGroupMatch, '批量编辑区结构缺失');

  const editorGroupHtml = editorGroupMatch[0];
  assert.ok(editorGroupHtml.includes('>批量改价</h3>'));
  assert.ok(editorGroupHtml.includes('id="batchFixedContextSummary"'));
  assert.ok(editorGroupHtml.includes('id="batchFixedCurrentPrice"'));
  assert.ok(editorGroupHtml.includes('id="batchFixedOriginalPrice"'));
  assert.ok(editorGroupHtml.includes('id="batchSaleOnBtn"'));
  assert.ok(editorGroupHtml.includes('id="batchSaleOffBtn"'));
  assert.ok(editorGroupHtml.includes('id="batchFixedSubmitBtn"'));
});

test('批量改价：编辑卡片与列表容器应与共享筛选左侧对齐', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.batch-fixed-panel\s*\{[\s\S]*?margin:\s*0\s+0\s+16px;/.test(html));
  assert.ok(/\.batch-fixed-list-wrap\s*\{[\s\S]*?margin:\s*0\s+0\s+22px;/.test(html));
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

test('批量改价：移动端应改为无横向滚动的堆叠卡片布局', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/@media \(max-width:\s*768px\)\s*\{[\s\S]*?\.batch-fixed-list-wrap\s*\{[^}]*overflow:\s*visible;[^}]*\}/.test(html));
  assert.ok(/@media \(max-width:\s*768px\)\s*\{[\s\S]*?\.batch-fixed-list-head\s*\{[^}]*display:\s*none;[^}]*\}/.test(html));
  assert.ok(/@media \(max-width:\s*768px\)\s*\{[\s\S]*?\.batch-fixed-row\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*min-width:\s*0;[^}]*\}/.test(html));
  assert.ok(html.includes('class="batch-fixed-cell-label">现价</span>'));
  assert.ok(html.includes('class="batch-fixed-cell-label">原价</span>'));
  assert.ok(html.includes('class="batch-fixed-cell-label">状态</span>'));
});

test('共享上下文：移动端分类下拉与搜索输入应使用更大的字号', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/@media \(max-width:\s*768px\)\s*\{[\s\S]*?\.menu-shared-context\s+\.form-input,\s*[\s\S]*?\.menu-shared-context\s+\.form-select\s*\{[^}]*font-size:\s*16px;[^}]*min-height:\s*50px;[^}]*\}/.test(html));
});

test('共享上下文：移动端应改为底部抽屉并支持分类排序模式', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/function\s+openMenuSharedMobileCategoryDrawer\s*\(/.test(html));
  assert.ok(/function\s+setMenuSharedMobileCategoryMode\s*\(/.test(html));
  assert.ok(/function\s+saveMenuSharedMobileCategoryOrder\s*\(/.test(html));
  assert.ok(html.includes('id="menuSharedMobileCategorySheetBody"'));
  assert.ok(html.includes('id="menuSharedMobileCategorySheetFooter"'));
  assert.ok(html.includes('调整顺序'));
  assert.ok(html.includes('保存顺序'));
});

test('共享上下文：移动端分类按钮应同步当前筛选文案', () => {
  const ctx = loadMenuContext();
  ctx.window.innerWidth = 390;
  ctx.currentMenuInnerTab = 'manage';
  ctx.menuSharedCategoryFilter = '千人千味';

  ctx.renderMenuSharedContext();

  assert.strictEqual(
    ctx.document.getElementById('menuManageCategoryMobileTriggerText').textContent,
    '千人千味'
  );
});

test('共享上下文：移动端分类抽屉在选择态应提供分类编辑入口', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    A: { icon: '☕', items: [{ id: 1 }] },
    B: { icon: '🎨', items: [{ id: 2 }] }
  };
  ctx.window.innerWidth = 390;
  ctx.currentMenuInnerTab = 'manage';

  ctx.openMenuSharedMobileCategoryDrawer();

  const drawerHtml = ctx.document.getElementById('menuSharedMobileCategorySheetBody').innerHTML;
  assert.ok(drawerHtml.includes('全部分类'));
  assert.ok(!drawerHtml.includes('个商品'));
  assert.strictEqual((drawerHtml.match(/menu-shared-mobile-category-edit-btn/g) || []).length, 2);
  assert.ok(drawerHtml.includes("handleCategoryEditAction('A')"));
  assert.ok(drawerHtml.includes("handleCategoryEditAction('B')"));
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

test('批量改价：多分类商品在全量列表中应按商品ID去重，并按唯一商品计数提交结果', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    经典系列: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 12, names: { zh: '同款拿铁' } }
      ]
    },
    今日推荐: {
      icon: '⭐',
      items: [
        { id: 1, price: 10, originalPrice: 12, names: { zh: '同款拿铁' } },
        { id: 2, price: 13, originalPrice: 15, names: { zh: '抹茶牛奶' } }
      ]
    }
  };

  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('__ALL__');

  const entries = ctx.getBatchFixedPriceEntries('__ALL__');
  assert.strictEqual(entries.length, 2);
  const entryIds = Array.from(entries, entry => Number(entry.product.id));
  assert.strictEqual(entryIds.join(','), '1,2');

  const listHtml = ctx.document.getElementById('batchFixedListContainer').innerHTML;
  assert.strictEqual((listHtml.match(/同款拿铁/g) || []).length, 1);
  assert.ok(listHtml.includes('经典系列'));
  assert.ok(listHtml.includes('今日推荐'));

  ctx.setBatchFixedPriceSelectedIds([1]);
  const result = ctx.applyBatchFixedPriceBySelection('__ALL__', { currentPrice: 11, originalPrice: null });
  assert.strictEqual(result.successCount, 1);
  assert.strictEqual(result.failedCount, 0);
  assert.strictEqual(ctx.productsData.经典系列.items[0].price, 11);
  assert.strictEqual(ctx.productsData.今日推荐.items[0].price, 11);
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

test('批量固定改价：多选提交时应先模拟失败一行，第二次提交再成功', () => {
  const ctx = loadMenuContext();
  const toasts = [];
  ctx.showToast = (message, type) => {
    toasts.push({ message, type });
  };
  ctx.productsData = {
    测试分类: {
      icon: '☕',
      items: [
        { id: 1, price: 10, originalPrice: 15, names: { zh: '商品1' } },
        { id: 2, price: 8, originalPrice: 12, names: { zh: '商品2' } }
      ]
    }
  };

  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('测试分类');
  ctx.setBatchFixedPriceSelectedIds([1, 2]);
  ctx.document.getElementById('batchFixedCurrentPrice').value = '11';
  ctx.document.getElementById('batchFixedOriginalPrice').value = '';

  ctx.submitBatchFixedPriceUpdate();

  let batchState = ctx.getBatchFixedPriceStateSnapshot();
  const failedIds = Object.keys(batchState.failedMap).map(id => Number(id));
  assert.strictEqual(failedIds.length, 1);
  assert.strictEqual(batchState.successIds.length, 1);
  assert.ok(String(batchState.failedMap[failedIds[0]]).includes('模拟失败'));
  assert.ok(toasts.some(item => item.message.includes('成功 1，失败 1')));

  const failedProduct = ctx.productsData.测试分类.items.find(item => item.id === failedIds[0]);
  assert.strictEqual(failedProduct.price, failedIds[0] === 1 ? 10 : 8);

  ctx.document.getElementById('batchFixedCurrentPrice').value = '12';
  ctx.document.getElementById('batchFixedOriginalPrice').value = '16';
  ctx.submitBatchFixedPriceUpdate();

  batchState = ctx.getBatchFixedPriceStateSnapshot();
  assert.strictEqual(Object.keys(batchState.failedMap).length, 0);
  assert.strictEqual(batchState.selectedIds.length, 0);
  assert.ok(toasts.some(item => item.message.includes('成功 1，失败 0')));
  assert.strictEqual(ctx.productsData.测试分类.items[0].price, 11);
  assert.strictEqual(ctx.productsData.测试分类.items[1].price, 12);
  assert.strictEqual(ctx.productsData.测试分类.items[1].originalPrice, 16);
});

test('批量固定改价：失败后摘要应提示失败项保留选中并再次点击提交改价', () => {
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

  ctx.switchMenuInnerTab('batch');
  ctx.setBatchFixedPriceActiveCategory('测试分类');
  ctx.setBatchFixedPriceSelectedIds([1, 2]);
  ctx.document.getElementById('batchFixedCurrentPrice').value = '11';
  ctx.document.getElementById('batchFixedOriginalPrice').value = '';

  ctx.submitBatchFixedPriceUpdate();

  const summaryText = ctx.document.getElementById('batchFixedSummary').textContent;
  assert.ok(summaryText.includes('失败 1'));
  assert.ok(summaryText.includes('失败项已保留选中'));
  assert.ok(summaryText.includes('再次点击提交改价'));
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
