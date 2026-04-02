const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error('inline script not found');
  }
  return match[1];
}

function createElement(id) {
  return {
    id,
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    clientWidth: 240,
    scrollWidth: 120,
    children: [],
    disabled: false,
    focus() {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    contains() {
      return false;
    },
    addEventListener() {},
    setAttribute(name, value) {
      this[name] = value;
    },
    getAttribute(name) {
      return this[name];
    },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      }
    }
  };
}

function createRuntime(storageSeed = {}) {
  const helperPath = path.join(__dirname, '..', 'shared', 'business-tag-library.js');
  const helperScript = fs.readFileSync(helperPath, 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'product-detail.html'), 'utf8');
  const script = `${extractInlineScript(html)}
this.__test = {
  setCurrentDevice(value) { currentDevice = value; },
  setCurrentLang(value) { currentLang = value; },
  setProductCategoryOptions(options) { productCategoryOptions = options; },
  setSelectedProductCategoryKeys(keys) { selectedProductCategoryKeys = new Set(keys || []); },
  setProductData(value) { productData = cloneProductValue(value); },
  setSelectedBusinessTagIds(value) { selectedBusinessTagIds = BusinessTags.normalizeBusinessTagIds(value); },
  getSelectedBusinessTagIds() { return Array.from(selectedBusinessTagIds); },
  getBusinessTagLanguageContext,
  canCreateBusinessTag,
  openBusinessTagDraft() { return openBusinessTagDraft('create'); },
  editBusinessTagDraft(tagId) { return openBusinessTagDraft('edit', tagId); },
  setBusinessTagDraftValue(lang, value) { updateBusinessTagDraftField(lang, value); },
  saveBusinessTagDraft() { return submitBusinessTagDraft(); },
  getDraftLibrary() { return cloneProductValue(collectProductBusinessTagLibraryDraft()); },
  getStoredLibrary() { return cloneProductValue(getStoredBusinessTagLibrary()); },
  getBusinessTagLibrary() { return cloneProductValue(getBusinessTagLibrary()); },
  saveProduct,
  getSavedProduct(productId) {
    const edits = JSON.parse(localStorage.getItem('menuProductEdits') || '{}');
    return cloneProductValue(edits[String(productId)] || edits[Number(productId)] || null);
  },
  getRenderableLabels(product) {
    return BusinessTags.getRenderableProductTags(product, getBusinessTagLibrary()).map(tag => BusinessTags.resolveTagLabel(tag, currentLang));
  },
  commitTagAndProductSaveWithInjectedFailure(kind) {
    const previousLibrary = {
      tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' }
    };
    const nextLibrary = {
      tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' },
      tag_new: { id: 'tag_new', names: { zh: '新品', en: 'New' }, status: 'active' }
    };
    const previousProduct = {
      id: 301,
      names: { zh: '测试商品' },
      descs: {},
      price: 18,
      onSale: true,
      businessTagIds: ['tag_signature']
    };
    const nextProduct = {
      ...previousProduct,
      businessTagIds: ['tag_signature', 'tag_new']
    };
    persistBusinessTagLibrary(previousLibrary);
    persistEditedProduct(previousProduct);

    let productPersistCount = 0;
    const originalPersistEditedProduct = persistEditedProduct;
    persistEditedProduct = function(product) {
      productPersistCount += 1;
      if (kind === 'product' && productPersistCount === 1) {
        throw new Error('product persist failure');
      }
      return originalPersistEditedProduct(product);
    };

    const result = TagProductSaveCoordinator.commit({
      previousLibrary,
      nextLibrary,
      previousProduct,
      nextProduct
    });

    persistEditedProduct = originalPersistEditedProduct;

    return {
      result,
      storedLibrary: cloneProductValue(getStoredBusinessTagLibrary()),
      savedProduct: this.getSavedProduct(previousProduct.id)
    };
  }
};`;

  const storage = { ...storageSeed };
  const elements = {};
  const selectorMap = {};
  const toastMessages = [];

  const context = {
    console,
    URLSearchParams,
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      }
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    document: {
      getElementById(id) {
        if (!elements[id]) {
          elements[id] = createElement(id);
        }
        return elements[id];
      },
      querySelector(selector) {
        if (!selectorMap[selector]) {
          selectorMap[selector] = createElement(selector);
        }
        return selectorMap[selector];
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {}
    },
    window: {
      COFE_SHARED_MOCK_DATA: {},
      addEventListener() {},
      history: { replaceState() {} },
      location: { pathname: '/product-detail.html', search: '', href: '' },
      innerWidth: 1440,
      name: ''
    },
    setTimeout(fn) {
      if (typeof fn === 'function') fn();
      return 1;
    },
    clearTimeout() {},
    confirm() { return true; },
    prompt() { return null; }
  };

  vm.createContext(context);
  vm.runInContext(helperScript, context);
  context.BusinessTags = context.window.CofeBusinessTags || context.globalThis?.CofeBusinessTags || context.CofeBusinessTags;
  vm.runInContext(script, context);

  context.showToast = (message, type = 'success') => {
    toastMessages.push(`${type}:${message}`);
  };
  context.__test.setCurrentDevice('RCK111');
  context.__test.setCurrentLang('zh');
  context.__test.setProductCategoryOptions([{ key: 'coffee', names: { zh: '咖啡', en: 'Coffee' } }]);
  context.__test.setSelectedProductCategoryKeys(['coffee']);
  context.document.getElementById('productPrice').value = '18';
  context.document.getElementById('productOriginalPrice').value = '';
  context.document.getElementById('productImage').value = '';
  context.document.getElementById('onSaleSwitch').checked = true;
  context.document.getElementById('toast');
  context.document.getElementById('productBusinessTagEditorModal');
  context.document.getElementById('productBusinessTagSelectedList');
  context.document.getElementById('productBusinessTagOptionList');
  context.document.getElementById('headerSaveBtn');
  context.document.getElementById('productBusinessTagEditBtn');
  selectorMap['.product-name-zh'] = createElement('.product-name-zh');
  selectorMap['.product-name-zh'].value = '测试商品';
  selectorMap['.product-name-en'] = createElement('.product-name-en');
  selectorMap['.product-name-en'].value = 'Test product';
  selectorMap['.product-desc-zh'] = createElement('.product-desc-zh');
  selectorMap['.product-desc-zh'].value = '';
  selectorMap['.product-desc-en'] = createElement('.product-desc-en');
  selectorMap['.product-desc-en'].value = '';

  return {
    ...context.__test,
    storage,
    toastMessages,
    elements,
    selectorMap
  };
}

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

test('inline 新建标签 should require the current device primary language', () => {
  const runtime = createRuntime({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: ['zh', 'en'],
      hiddenLangs: [],
      langNames: { zh: '中文', en: 'English' }
    })
  });

  runtime.openBusinessTagDraft();
  runtime.setBusinessTagDraftValue('zh', '');
  runtime.setBusinessTagDraftValue('en', 'Seasonal');
  const result = runtime.saveBusinessTagDraft();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 'validation_failed');
});

test('invalid device language config should disable inline 新建标签', () => {
  const runtime = createRuntime({
    deviceLanguageConfig_RCK111: JSON.stringify({
      langs: [],
      hiddenLangs: [],
      langNames: {}
    })
  });

  assert.strictEqual(runtime.canCreateBusinessTag(), false);
  assert.strictEqual(runtime.getBusinessTagLanguageContext().ok, false);
});

test('saveProduct should preserve hidden ids after visible reorder', () => {
  const runtime = createRuntime({
    menuBusinessTagLibrary: JSON.stringify({
      tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' },
      tag_new: { id: 'tag_new', names: { zh: '新品', en: 'New' }, status: 'active' },
      tag_hidden: { id: 'tag_hidden', names: { zh: '隐藏标签', en: 'Hidden' }, status: 'hidden' }
    })
  });

  runtime.setProductData({
    id: 101,
    names: { zh: '测试商品', en: 'Test Product' },
    descs: {},
    price: 18,
    onSale: true,
    businessTagIds: ['tag_hidden', 'tag_signature', 'tag_new']
  });
  runtime.setSelectedBusinessTagIds(['tag_new', 'tag_signature']);
  runtime.saveProduct();

  const saved = runtime.getSavedProduct(101);
  assert.deepStrictEqual(Array.from(saved.businessTagIds || []), ['tag_new', 'tag_signature', 'tag_hidden']);
});

test('first save of a legacy featured product should materialize tag_signature into businessTagIds', () => {
  const runtime = createRuntime({
    menuBusinessTagLibrary: JSON.stringify({
      tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' }
    })
  });

  runtime.setProductData({
    id: 102,
    names: { zh: '遗留商品', en: 'Legacy Product' },
    descs: {},
    price: 20,
    onSale: true,
    featured: true,
    businessTagIds: []
  });
  runtime.setSelectedBusinessTagIds([]);
  runtime.saveProduct();

  const saved = runtime.getSavedProduct(102);
  assert.deepStrictEqual(Array.from(saved.businessTagIds || []), ['tag_signature']);
});

test('TagProductSaveCoordinator should rollback tag library when product persistence fails', () => {
  const runtime = createRuntime();
  const outcome = runtime.commitTagAndProductSaveWithInjectedFailure('product');

  assert.strictEqual(outcome.result.ok, false);
  assert.strictEqual(outcome.result.status, 'rolled_back');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(outcome.storedLibrary)), {
    tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' }
  });
  assert.deepStrictEqual(Array.from(outcome.savedProduct.businessTagIds || []), ['tag_signature']);
});

test('product save should re-resolve the current library if a tag becomes hidden while the editor is open', () => {
  const runtime = createRuntime({
    menuBusinessTagLibrary: JSON.stringify({
      tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'active' }
    })
  });

  runtime.setProductData({
    id: 103,
    names: { zh: '并发商品', en: 'Concurrent Product' },
    descs: {},
    price: 22,
    onSale: true,
    businessTagIds: ['tag_signature']
  });
  runtime.setSelectedBusinessTagIds(['tag_signature']);
  runtime.storage.menuBusinessTagLibrary = JSON.stringify({
    tag_signature: { id: 'tag_signature', names: { zh: '招牌', en: 'Signature' }, status: 'hidden' }
  });
  runtime.saveProduct();

  const saved = runtime.getSavedProduct(103);
  const visibleLabels = runtime.getRenderableLabels(saved);
  assert.deepStrictEqual(Array.from(saved.businessTagIds || []), ['tag_signature']);
  assert.ok(!visibleLabels.includes('招牌'));
});
