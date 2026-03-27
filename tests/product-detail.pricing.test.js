const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, '..', 'product-detail.html');
const html = fs.readFileSync(filePath, 'utf8');

function extractFunctionSource(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error(`未找到函数 ${name}`);
  }

  const bodyStart = html.indexOf('{', start);
  if (bodyStart === -1) {
    throw new Error(`函数 ${name} 缺少函数体`);
  }

  let depth = 0;
  for (let index = bodyStart; index < html.length; index += 1) {
    const char = html[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, index + 1);
      }
    }
  }

  throw new Error(`函数 ${name} 未正常结束`);
}

function createClassList() {
  const classNames = new Set();
  return {
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
  };
}

function createPreviewRuntimeContext() {
  const queryElements = {
    '.product-name-zh': { value: '临时商品名' },
    '.product-name-en': { value: 'Draft Latte' },
    '.product-desc-zh': { value: '临时描述文案' },
    '.product-desc-en': { value: 'Draft description' }
  };
  const elements = {
    embeddedOrderPreviewOverlay: {
      classList: createClassList()
    },
    embeddedOrderPreviewFrame: {
      src: '',
      onload: null,
      contentWindow: {
        postMessageCalls: [],
        postMessage(message, targetOrigin) {
          this.postMessageCalls.push({ message, targetOrigin });
        }
      }
    },
    productImage: {
      value: 'https://example.com/draft-image.png'
    },
    productPrice: {
      value: '31.5'
    },
    productOriginalPrice: {
      value: '39.9'
    },
    onSaleSwitch: {
      checked: false
    }
  };

  const context = {
    currentDevice: 'RCK111',
    URL,
    URLSearchParams,
    console,
    saveProductCalls: 0,
    productData: {
      id: 101,
      names: { zh: '已保存商品', en: 'Saved Latte' },
      descs: { zh: '已保存描述', en: 'Saved description' },
      image: 'https://example.com/saved-image.png',
      price: 28,
      originalPrice: 35,
      onSale: true
    },
    getDeviceLangs() {
      return ['zh', 'en'];
    },
    saveProduct() {
      context.saveProductCalls += 1;
      return true;
    },
    document: {
      getElementById(id) {
        return elements[id] || null;
      },
      querySelector(selector) {
        return queryElements[selector] || null;
      }
    },
    window: {
      location: {
        origin: 'http://127.0.0.1:4174',
        href: 'http://127.0.0.1:4174/product-detail.html?id=101&device=RCK111'
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(extractFunctionSource('buildOrderPreviewUrl'), context);
  vm.runInContext(extractFunctionSource('buildEmbeddedOrderPreviewUrl'), context);
  vm.runInContext(extractFunctionSource('buildOrderPreviewDraftPayload'), context);
  vm.runInContext(extractFunctionSource('openEmbeddedOrderPreviewModal'), context);
  vm.runInContext(extractFunctionSource('closeEmbeddedOrderPreviewModal'), context);
  vm.runInContext(extractFunctionSource('saveProductAndOpenOrderPreview'), context);
  context.__elements = elements;
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

test('商品编辑表单不应包含单商品币种输入项', () => {
  assert.ok(!html.includes('id="productCurrency"'));
});

test('商品编辑表单不应再包含推荐商品开关', () => {
  assert.ok(!html.includes('id="featuredSwitch"'));
  assert.ok(!html.includes('推荐商品'));
});

test('商品编辑表单应包含原价输入项', () => {
  assert.ok(html.includes('id="productOriginalPrice"'));
});

test('商品编辑表单应包含业务标签编辑区', () => {
  assert.ok(html.includes('业务标签'));
  assert.ok(html.includes('id="productBusinessTagSummary"'));
  assert.ok(html.includes('id="productBusinessTagEditBtn"'));
  assert.ok(html.includes('id="productBusinessTagEditorModal"'));
});

test('商品编辑表单应将所属分类改为可编辑多分类选择', () => {
  assert.ok(html.includes('id="productCategorySummary"'));
  assert.ok(html.includes('id="productCategoryChips"'));
  assert.ok(html.includes('id="productCategoryOptions"'));
  assert.ok(!/id="categoryName"[^>]*readonly/.test(html));
});

test('原价输入区域应采用紧凑宽度样式', () => {
  assert.ok(html.includes('class="form-group form-group-original-price"'));
  assert.ok(/\.form-group-original-price\s*\{[\s\S]*max-width:\s*420px;/.test(html));
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

test('saveProduct 不应读取或覆盖单商品币种字段', () => {
  assert.ok(!/getElementById\('productCurrency'\)/.test(html));
  assert.ok(!/currency:\s*currency/.test(html));
});

test('saveProduct 应持久化 originalPrice 字段', () => {
  assert.ok(/originalPrice:\s*originalPrice/.test(html));
});

test('saveProduct 应持久化有序 businessTagIds，而不是布尔推荐开关', () => {
  assert.ok(/let\s+selectedBusinessTagIds\s*=\s*\[\]/.test(html));
  assert.ok(/function\s+moveSelectedBusinessTag\s*\(/.test(html));
  assert.ok(/businessTagIds:\s*selectedBusinessTagIds/.test(html));
  assert.ok(!/featured:\s*document\.getElementById\('featuredSwitch'\)\.checked/.test(html));
});

test('saveProduct 应持久化商品所属分类，并要求至少选择一个分类', () => {
  assert.ok(html.includes("menuProductCategoryAssignments"));
  assert.ok(/function\s+persistProductCategoryAssignments\s*\(/.test(html));
  assert.ok(/showToast\('请至少选择一个所属分类'/.test(html));
});

test('商品详情头部操作区应改为取消、预览点单屏、保存编辑三按钮', () => {
  assert.ok(/id="headerCancelBtn"[^>]*>取消<\/button>/.test(html));
  assert.ok(/id="headerPreviewBtn"[^>]*onclick="saveProductAndOpenOrderPreview\(\)"[^>]*>[\s\S]*预览点单屏[\s\S]*<\/button>/.test(html));
  assert.ok(/id="headerSaveBtn"[^>]*onclick="saveProduct\(\)"[^>]*>保存编辑<\/button>/.test(html));
});

test('商品详情头部三按钮应改为更紧凑的尺寸', () => {
  assert.ok(/\.header-actions\s*\{[\s\S]*gap:\s*12px;[\s\S]*min-width:\s*min\(100%,\s*520px\);/.test(html));
  assert.ok(/\.header-actions \.btn\s*\{[\s\S]*min-height:\s*56px;[\s\S]*border-radius:\s*16px;[\s\S]*font-size:\s*15px;/.test(html));
  assert.ok(/@media \(max-width: 768px\)\s*\{[\s\S]*\.header-actions \.btn\s*\{[\s\S]*min-height:\s*48px;[\s\S]*font-size:\s*13px;/.test(html));
});

test('详情页应支持不保存当前草稿，并在弹层中打开点单屏预览', () => {
  assert.ok(html.includes('id="embeddedOrderPreviewOverlay"'));
  assert.ok(html.includes('id="embeddedOrderPreviewFrame"'));
  assert.ok(/function\s+buildEmbeddedOrderPreviewUrl\s*\(\)\s*\{[\s\S]*embedOrderPreview[\s\S]*'1'/.test(html));
  assert.ok(/function\s+buildOrderPreviewDraftPayload\s*\(\)\s*\{/.test(html));
  assert.ok(/function\s+openEmbeddedOrderPreviewModal\s*\([^)]*\)\s*\{/.test(html));
  assert.ok(/function\s+closeEmbeddedOrderPreviewModal\s*\(\)\s*\{/.test(html));
  assert.ok(/function\s+saveProductAndOpenOrderPreview\s*\(\)\s*\{[\s\S]*openEmbeddedOrderPreviewModal\([\s\S]*buildOrderPreviewDraftPayload\(\)/.test(html));
  assert.ok(!/setTimeout\(\(\)\s*=>\s*\{\s*goBack\(\);/.test(html));
});

test('详情页预览点单屏时应直接预览当前基础信息草稿而不触发保存', () => {
  const context = createPreviewRuntimeContext();
  const currentHref = context.window.location.href;

  const result = context.saveProductAndOpenOrderPreview();

  assert.strictEqual(result, true);
  assert.strictEqual(context.saveProductCalls, 0);
  assert.strictEqual(context.window.location.href, currentHref);
  assert.ok(context.__elements.embeddedOrderPreviewOverlay.classList.contains('active'));
  assert.strictEqual(
    context.__elements.embeddedOrderPreviewFrame.src,
    'http://127.0.0.1:4174/menu-management.html?tab=menu&innerTab=manage&device=RCK111&openOrderPreview=1&embedOrderPreview=1'
  );
  assert.strictEqual(typeof context.__elements.embeddedOrderPreviewFrame.onload, 'function');

  context.__elements.embeddedOrderPreviewFrame.onload();

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.__elements.embeddedOrderPreviewFrame.contentWindow.postMessageCalls)),
    [{
      message: {
        type: 'orderPreviewDraftPayload',
        payload: {
          productId: 101,
          names: { zh: '临时商品名', en: 'Draft Latte' },
          descs: { zh: '临时描述文案', en: 'Draft description' },
          image: 'https://example.com/draft-image.png',
          price: 31.5,
          originalPrice: 39.9,
          onSale: false
        }
      },
      targetOrigin: 'http://127.0.0.1:4174'
    }]
  );
});

test('详情页预览点单屏应通过 iframe postMessage 发送草稿，而不是写入存储或触发保存', () => {
  assert.ok(/contentWindow\.postMessage\(\{\s*type:\s*'orderPreviewDraftPayload'/.test(html));
  assert.ok(!extractFunctionSource('saveProductAndOpenOrderPreview').includes('saveProduct()'));
});

test('详情页关闭点单屏预览时应收起弹层并清空 iframe', () => {
  const context = createPreviewRuntimeContext();

  context.openEmbeddedOrderPreviewModal();
  context.closeEmbeddedOrderPreviewModal();

  assert.ok(!context.__elements.embeddedOrderPreviewOverlay.classList.contains('active'));
  assert.strictEqual(context.__elements.embeddedOrderPreviewFrame.src, '');
});

test('返回菜单页应默认定位到菜单管理内层tab', () => {
  assert.ok(/menu-management\.html\?tab=menu&innerTab=manage/.test(html));
});

test('返回菜单页时应优先复用商品管理返回上下文', () => {
  assert.ok(/MENU_MANAGEMENT_RETURN_STATE_KEY/.test(html));
  assert.ok(/function\s+buildMenuManagementReturnUrl\s*\(/.test(html));
  assert.ok(/sessionStorage\.getItem\(MENU_MANAGEMENT_RETURN_STATE_KEY\)/.test(html));
  assert.ok(/window\.location\.href = buildMenuManagementReturnUrl\(\)/.test(html));
});

test('详情页应支持通过 payloadKey 从会话存储读取数据', () => {
  assert.ok(/const\s+payloadKey\s*=\s*params\.get\('payloadKey'\)/.test(html));
  assert.ok(/sessionStorage\.getItem\(`productDetailPayload:\$\{payloadKey\}`\)/.test(html));
  assert.ok(/payload && Array\.isArray\(payload\.categoryOptions\)/.test(html));
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

test('详情页应支持渲染当前商品的多分类归属并切换分类勾选', () => {
  assert.ok(/function\s+getInitialAssignedCategoryKeys\s*\(/.test(html));
  assert.ok(/function\s+renderProductCategorySelector\s*\(/.test(html));
  assert.ok(/function\s+toggleProductCategorySelection\s*\(/.test(html));
  assert.ok(/function\s+persistProductCategoryAssignments\s*\(/.test(html));
});

test('详情页应将基本信息与配方配置拆分为分页签', () => {
  assert.ok(html.includes('id="productDetailTabBasicBtn"'));
  assert.ok(html.includes('id="productDetailTabRecipeBtn"'));
  assert.ok(html.includes('id="productDetailBasicPanel"'));
  assert.ok(html.includes('id="productDetailRecipePanel"'));
  assert.ok(/function\s+switchProductDetailTab\s*\(/.test(html));
  assert.ok(/switchProductDetailTab\('basic'\)/.test(html));
});

test('基本信息中的多语言商品信息应改为矩阵式桌面布局并带移动端语种切换', () => {
  assert.ok(/\.multilang-sheet\s*\{/.test(html));
  assert.ok(/\.multilang-grid-scroll\s*\{[\s\S]*overflow-x:\s*auto;/.test(html));
  assert.ok(/\.multilang-grid-head\s*\{/.test(html));
  assert.ok(/\.multilang-grid-row\s*\{/.test(html));
  assert.ok(/\.multilang-mobile-switch\s*\{/.test(html));
  assert.ok(/function\s+setProductInfoActiveLang\s*\(/.test(html));
  assert.ok(/function\s+buildMultilangGridMarkup\s*\(/.test(html));
  assert.ok(/function\s+renderMultiLangInputs\s*\([\s\S]*?buildMultilangGridMarkup\(/.test(html));
  assert.ok(!/function\s+renderMultiLangInputs\s*\([\s\S]*?lang-section/.test(html));
});

test('标签配置抽屉应复用同一套多语言矩阵布局', () => {
  assert.ok(/function\s+setDrawerActiveLang\s*\(/.test(html));
  assert.ok(/function\s+buildMultilangGridMarkup\s*\(/.test(html));
  assert.ok(/function\s+renderDrawerEditor\s*\([\s\S]*?buildMultilangGridMarkup\(/.test(html));
  assert.ok(/function\s+renderDrawerEditor\s*\([\s\S]*?drawer-tag-lang-/.test(html));
  assert.ok(!/function\s+renderDrawerEditor\s*\([\s\S]*?lang-section/.test(html));
});

test('详情页应支持复制模式，并提供确认复制步骤', () => {
  assert.ok(/const\s+copyMode\s*=\s*params\.get\('mode'\)/.test(html));
  assert.ok(/copyMode === 'copy'/.test(html));
  assert.ok(html.includes('id="productCopyFlowSteps"'));
  assert.ok(html.includes('id="productCopyStepBasic"'));
  assert.ok(html.includes('id="productCopyStepRecipe"'));
  assert.ok(html.includes('id="productCopyStepConfirm"'));
  assert.ok(html.includes('id="productDetailConfirmPanel"'));
});

test('复制模式应提供确认页渲染与最终确认处理函数', () => {
  assert.ok(/function\s+renderCopyConfirmPanel\s*\(/.test(html));
  assert.ok(/function\s+buildCopyConfirmData\s*\(/.test(html));
  assert.ok(/function\s+confirmCopyProduct\s*\(/.test(html));
  assert.ok(/function\s+goToCopyWorkflowStep\s*\(/.test(html));
  assert.ok(/function\s+updateCopyWorkflowActions\s*\(/.test(html));
});

test('复制模式顶部步骤条应为只读进度，不应与上下步按钮重复导航', () => {
  assert.ok(/id="productCopyStepBasic"(?![^>]*onclick)/.test(html));
  assert.ok(/id="productCopyStepRecipe"(?![^>]*onclick)/.test(html));
  assert.ok(/id="productCopyStepConfirm"(?![^>]*onclick)/.test(html));
  assert.ok(!/<button[^>]*id="productCopyStepBasic"/.test(html));
  assert.ok(!/<button[^>]*id="productCopyStepRecipe"/.test(html));
  assert.ok(!/<button[^>]*id="productCopyStepConfirm"/.test(html));
  assert.ok(/id="copyWorkflowEditBasicBtn"[^>]*onclick="goToCopyWorkflowStep\('basic'\)"/.test(html));
  assert.ok(/id="copyWorkflowEditRecipeBtn"[^>]*onclick="goToCopyWorkflowStep\('recipe'\)"/.test(html));
});

test('复制模式确认页在图片未变化时应隐藏图片对比区块', () => {
  assert.ok(html.includes('id="copyConfirmImageSection"'));
  assert.ok(/const\s+shouldShowImageCompare\s*=\s*beforeSrc\s*!==\s*afterSrc;/.test(html));
  assert.ok(/imageSection\.style\.display\s*=\s*shouldShowImageCompare\s*\?\s*''\s*:\s*'none'/.test(html));
});

test('复制模式保存标签文案时应只更新当前复制商品，不弹批量同步弹窗', () => {
  assert.ok(/function\s+saveTagConfigDrawer\s*\([\s\S]*?persistRecipeChanges\(productData\s*\?\s*\[productData\]\s*:\s*\[\]\);[\s\S]*?if\s*\(isCopyWorkflowActive\(\)\)\s*\{[\s\S]*?closeTagConfigDrawer\(\);[\s\S]*?showToast\('标签配置已更新'\);[\s\S]*?return;[\s\S]*?\}/.test(html));
});

test('复制模式保存配方时应只更新当前复制商品，不弹关联商品确认', () => {
  assert.ok(/function\s+saveRecipeEditor\s*\([\s\S]*?if\s*\(isCopyWorkflowActive\(\)\)\s*\{[\s\S]*?setOptionRecipeLinkId\([\s\S]*?productData[\s\S]*?\);[\s\S]*?setOptionRecipe\([\s\S]*?productData[\s\S]*?\);[\s\S]*?persistRecipeChanges\(productData\s*\?\s*\[productData\]\s*:\s*\[\]\);[\s\S]*?closeRecipeEditor\(\);[\s\S]*?showToast\('配方配置已更新'\);[\s\S]*?return;[\s\S]*?\}/.test(html));
});

test('复制模式导入或恢复配方时不应提示进入关联饮品确认', () => {
  assert.ok(/showToast\(isCopyWorkflowActive\(\)\s*\?\s*'已恢复为出厂配方'\s*:\s*'已恢复为出厂配方，正在进入关联饮品确认'\)/.test(html));
  assert.ok(/showToast\(isCopyWorkflowActive\(\)\s*\?\s*'基底咖啡配方已导入'\s*:\s*'基底咖啡配方已导入，正在进入关联饮品确认'\)/.test(html));
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
  assert.ok(!/>\s*上移\s*<\/button>/.test(html));
  assert.ok(!/>\s*下移\s*<\/button>/.test(html));
  assert.ok(!/function\s+updateRecipeGroupNames\s*\(/.test(html));
  assert.ok(!html.includes('recipe-group-input'));
  assert.ok(html.includes('基底咖啡液'));
  assert.ok(html.includes('浓缩粉名称'));
  assert.ok(html.includes('装饰颗粒名称'));
});

test('配方分组排序应支持拖拽（含移动端触摸）', () => {
  assert.ok(html.includes('recipe-group-drag-handle'));
  assert.ok(/function\s+startRecipeGroupDrag\s*\(/.test(html));
  assert.ok(/function\s+handleRecipeGroupDragOver\s*\(/.test(html));
  assert.ok(/function\s+endRecipeGroupDrag\s*\(/.test(html));
  assert.ok(/function\s+startRecipeGroupTouchDrag\s*\(/.test(html));
  assert.ok(/function\s+handleRecipeGroupTouchMove\s*\(/.test(html));
  assert.ok(/function\s+endRecipeGroupTouchDrag\s*\(/.test(html));
  assert.ok(!/if\s*\(!dragHandle\)\s*\{\s*event\.preventDefault\(\);\s*return;\s*\}/.test(html));
});

test('配方调整应支持上传基底咖啡配方文件并下载样例', () => {
  assert.ok(html.includes('id="baseRecipeUploadModal"'));
  assert.ok(html.includes('id="baseRecipeUploadInput"'));
  assert.ok(html.includes('下载样例文件'));
  assert.ok(/function\s+openBaseRecipeUploadModal\s*\(/.test(html));
  assert.ok(/function\s+downloadBaseRecipeTemplate\s*\(/.test(html));
  assert.ok(/function\s+applyBaseRecipeUpload\s*\(/.test(html));
  assert.ok(/function\s+extractBaseRecipePayload\s*\(/.test(html));
  assert.ok(/function\s+extractBaseRecipePayloadFromSheetText\s*\(/.test(html));
  assert.ok(html.includes("base-coffee-recipe-template.xls"));
  assert.ok(!html.includes("base-coffee-recipe-template.json"));
  assert.ok(/showToast\(isCopyWorkflowActive\(\)\s*\?\s*'基底咖啡配方已导入'\s*:\s*'基底咖啡配方已导入，正在进入关联饮品确认'\)/.test(html));
  assert.ok(/saveRecipeEditor\(\);/.test(html));
});

test('配方调整应支持恢复出厂设置', () => {
  assert.ok(html.includes('恢复出厂设置'));
  assert.ok(/function\s+resetRecipeToFactoryDefaults\s*\(/.test(html));
  assert.ok(/confirm\('确认恢复出厂设置/.test(html));
  assert.ok(/getDefaultRecipeData\(recipeEditorState\.tagLabel\)/.test(html));
  assert.ok(/showToast\(isCopyWorkflowActive\(\)\s*\?\s*'已恢复为出厂配方'\s*:\s*'已恢复为出厂配方，正在进入关联饮品确认'\)/.test(html));
  assert.ok(/saveRecipeEditor\(\);/.test(html));
});

test('影响商品列表不应包含当前商品', () => {
  assert.ok(/if\s*\(productData\s*&&\s*Number\(productData\.id\)\s*===\s*id\)\s*return\s+null;/.test(html));
  assert.ok(/当前商品会直接更新/.test(html));
});

test('关联饮品确认应默认全选，勾选表示关联更新', () => {
  assert.ok(html.includes('全选关联'));
  assert.ok(html.includes('清空关联'));
  assert.ok(/selectedIds:\s*new Set\(affectedEntries\.map\(item => item\.id\)\)/.test(html));
  assert.ok(/if\s*\(!selectedIds\.has\(item\.id\)\)/.test(html));
  assert.ok(/不勾选则不关联/.test(html));
});

test('保存商品应持久化 recipe 关联字段', () => {
  assert.ok(/optionRecipes:\s*productData\.optionRecipes\s*\|\|\s*\{\}/.test(html));
  assert.ok(/optionRecipeLinks:\s*productData\.optionRecipeLinks\s*\|\|\s*\{\}/.test(html));
});

test('标签文案保存后应支持按勾选同步到同标签商品', () => {
  assert.ok(html.includes('id="tagSyncModal"'));
  assert.ok(html.includes('id="tagSyncBody"'));
  assert.ok(/function\s+getTagSyncEntries\s*\(/.test(html));
  assert.ok(/function\s+openTagSyncModal\s*\(/.test(html));
  assert.ok(/function\s+confirmTagSyncApply\s*\(/.test(html));
  assert.ok(/tagSyncState\s*=\s*\{[\s\S]*affectedEntries/.test(html));
  assert.ok(/toggleTagSyncProduct\('.*?',\s*this\.checked\)/.test(html));
});

test('标签编辑抽屉应支持设置附加价格并默认按 0 保存', () => {
  assert.ok(html.includes('附加价格'));
  assert.ok(html.includes('id="drawerTagExtraPrice"'));
  assert.ok(/function\s+getTagExtraPrice\s*\(/.test(html));
  assert.ok(/productData\.tagExtraPrices/.test(html));
  assert.ok(/const\s+extraPriceInput\s*=\s*document\.getElementById\('drawerTagExtraPrice'\)/.test(html));
  assert.ok(/setTagExtraPrice\(cfg\.specKey,\s*drawerSelectedTagKey,\s*extraPriceValue\)/.test(html));
  assert.ok(/tagExtraPrices:\s*productData\.tagExtraPrices\s*\|\|\s*\{\}/.test(html));
});

test('配方配置选项列表应将默认项前置显示', () => {
  assert.ok(/function\s+sortOptionListByPreferred\s*\(/.test(html));
  assert.ok(/dataset\.baseOrder/.test(html));
  assert.ok(/sortOptionListByPreferred\(meta\.listId,\s*preferred\s*\|\|\s*''\)/.test(html));
  assert.ok(/sortOptionListByPreferred\(cfg\.listId,\s*getDefaultOption\(cfg\.specKey\)\s*\|\|\s*''\)/.test(html));
});
