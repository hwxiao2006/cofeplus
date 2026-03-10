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
    window: {
      location: { pathname: '/menu-management.html', search: '', href: '' },
      history: { replaceState() {} },
      addEventListener() {}
    },
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
  context.__realRenderMenu = context.renderMenu;
  context.renderMenu = () => {};
  context.renderOverview = () => {};
  context.updateStats = () => {};
  context.showToast = () => {};
  context.__realUpdateDeviceLangs = context.updateDeviceLangs;
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

test('点单屏预览：应按当前语言展示分类与商品名称', () => {
  const ctx = loadMenuContext();
  ctx.currentLang = 'en';
  ctx.deviceConfig.RCK111.defaultOrderPreviewLang = '';
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
  ctx.deviceConfig.RCK111.defaultOrderPreviewLang = '';
  ctx.openOrderPreviewModal();

  const title = ctx.document.getElementById('orderPreviewProductsTitle').textContent;
  assert.ok(title.includes('3D Latte Art'));
  assert.ok(!title.includes('商品'));
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

test('复制商品流程应替换新增商品入口文案', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('openCopyProductModal()'));
  assert.ok(html.includes('openCopyProductModal(\'${categoryName}\')'));
  assert.ok(html.includes('复制商品'));
  assert.ok(!html.includes('>添加商品<'));
  assert.ok(!html.includes('>新增商品<'));
});

test('复制商品第一步应先选择目标分类，并支持直接新增分类', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('目标分类'));
  assert.ok(html.includes('id="copyProductTargetCategory"'));
  assert.ok(html.includes("openCategoryModal('copyTargetCategory')"));
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

test('从复制商品流程新增分类后，应自动选中新建的目标分类', () => {
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

  ctx.applyCopyProductTargetCategory('新品分类');

  assert.strictEqual(ctx.productCopyTargetCategory, '新品分类');
  assert.strictEqual(ctx.document.getElementById('copyProductTargetCategory').value, '新品分类');
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

test('商品售价：启用税费后应以税后价为主展示，并显示按税率倒推的税前价', () => {
  const ctx = loadMenuContext();
  ctx.document.getElementById('globalCurrencySelect').value = 'USD';
  ctx.document.getElementById('globalTaxEnabled').checked = true;
  ctx.document.getElementById('globalTaxRate').value = '10';
  ctx.saveMenuBasicSettings();
  const html = ctx.renderProductPriceHtml({
    price: 10
  }, { compact: false });

  assert.ok(!html.includes('税后'));
  assert.ok(html.includes('税前'));
  assert.ok(html.includes('USD 10.00'));
  assert.ok(html.includes('USD 9.09'));
});

test('基础设置：税率设置文案应说明前台默认显示税后价格', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('默认显示税后价格，并展示税前价格'));
  assert.ok(!html.includes('显示税前/税后价格'));
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

test('税率设置输入框应采用紧凑宽度样式', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/\.settings-tax-row\s*\{[^}]*align-items:\s*flex-start;[^}]*\}/.test(html));
  assert.ok(/\.settings-tax-input-wrap\s*\{[^}]*display:\s*inline-flex;[^}]*\}/.test(html));
  assert.ok(/\.settings-tax-input\s*\{[^}]*width:\s*96px;[^}]*\}/.test(html));
});

test('基础设置：应分别展示售价币种卡片和税率设置卡片', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(/<section class="settings-card(?:[^>]*)>[\s\S]*?<h3 class="settings-title">售价币种<\/h3>[\s\S]*?id="globalCurrencySelect"[\s\S]*?<\/section>/.test(html));
  assert.ok(/<section class="settings-card(?:[^>]*)>[\s\S]*?<h3 class="settings-title">税率设置<\/h3>[\s\S]*?id="globalTaxEnabled"[\s\S]*?id="globalTaxRate"[\s\S]*?<\/section>/.test(html));
  assert.ok(!html.includes('>价格与税率<'));
});

test('基础设置：三张卡片应恢复同排等高布局', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(!/\.settings-grid\s*\{[^}]*align-items:\s*start;[^}]*\}/.test(html));
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

test('基础设置：价格与税率卡片的税费控件应采用桌面端行内布局', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('class="settings-tax-row settings-tax-inline-row"'));
  assert.ok(/\.settings-tax-inline-row\s*\{[^}]*flex-direction:\s*row;[^}]*\}/.test(html));
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

test('按钮归属：新增分类按钮在菜单管理tab', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const headerMatch = html.match(/<div class="header-right">[\s\S]*?<\/div>\s*<\/header>/);
  assert.ok(headerMatch, '未找到顶部操作区片段');
  assert.ok(/header-manage-action[^>]*openCategoryModal\(\)/.test(headerMatch[0]), '顶部操作区缺少新增分类按钮');
});

test('菜单管理：应改为分类导航和商品工作区布局，并提供分类与商品筛选入口', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('id="menuManageWorkspace"'));
  assert.ok(html.includes('id="menuManageCategoryList"'));
  assert.ok(html.includes('id="menuManageCategoryKeyword"'));
  assert.ok(html.includes('id="menuManageCategorySelect"'));
  assert.ok(html.includes('id="menuManageProductKeyword"'));
  assert.ok(html.includes('id="menuManageScopeSelect"'));
  assert.ok(html.includes('setMenuManageActiveCategory('));
  assert.ok(html.includes('setMenuManageProductKeyword(this.value)'));
});

test('菜单管理工作区：桌面端工具栏应分组布局，商品网格不应固定 5 列', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('class="menu-manage-toolbar-fields"'));
  assert.ok(/\.menu-manage-toolbar-fields\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(160px,\s*200px\)\s+minmax\(320px,\s*1fr\);[^}]*\}/.test(html));
  assert.ok(/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-content\s+\.product-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(240px,\s*1fr\)\);[^}]*\}/.test(html));
  assert.ok(!/@media \(min-width:\s*1025px\)\s*\{[\s\S]*?\.menu-manage-content\s+\.product-grid\s*\{[^}]*repeat\(5,/.test(html));
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
  assert.ok(Array.isArray(payload.categoryOptions));
  assert.ok(payload.categoryOptions.length > 0);
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
  assert.ok(mobileSelectHtml.includes('value=\"拉花\"'));
  assert.ok(mobileSelectHtml.includes('value=\"新品\"'));
  assert.strictEqual(ctx.document.getElementById('menuManageCategorySelect').value, '新品');
});

test('菜单管理工作区：全部分类搜索结果应按商品ID去重并展示所属分类', () => {
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
  assert.ok(workspaceHtml.includes('经典咖啡'));
  assert.ok(workspaceHtml.includes('新品推荐'));
  assert.ok(!workspaceHtml.includes('美式'));
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
  assert.ok(!html.includes('id="batchFixedRetryBtn"'), '不应再展示失败重试按钮');
  assert.ok(!html.includes('id="batchFixedModeBtn"'), '不应保留菜单管理头部批量按钮');
});

test('批量改价：筛选条件与批量编辑区应分开显示', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  const filterGroupMatch = html.match(/<div class="batch-fixed-group batch-fixed-filter-group">[\s\S]*?<\/div>\s*<\/div>/);
  const editorGroupMatch = html.match(/<div class="batch-fixed-group batch-fixed-editor-group">[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(filterGroupMatch, '筛选区结构缺失');
  assert.ok(editorGroupMatch, '批量编辑区结构缺失');

  const filterGroupHtml = filterGroupMatch[0];
  const editorGroupHtml = editorGroupMatch[0];
  assert.ok(filterGroupHtml.includes('>批量筛选</h3>'));
  assert.ok(filterGroupHtml.includes('id="batchFixedCategorySelect"'));
  assert.ok(filterGroupHtml.includes('id="batchFixedKeyword"'));
  assert.ok(!filterGroupHtml.includes('id="batchFixedCurrentPrice"'), '现价输入不应放在筛选区');
  assert.ok(!filterGroupHtml.includes('id="batchFixedOriginalPrice"'), '原价输入不应放在筛选区');
  assert.ok(editorGroupHtml.includes('>批量编辑</h3>'));
  assert.ok(editorGroupHtml.includes('id="batchFixedCurrentPrice"'));
  assert.ok(editorGroupHtml.includes('id="batchFixedOriginalPrice"'));
  assert.ok(editorGroupHtml.includes('id="batchFixedSubmitBtn"'));
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
