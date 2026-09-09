const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const detail = fs.readFileSync(path.join(__dirname, '../product-detail.html'), 'utf8');
const menu = fs.readFileSync(path.join(__dirname, '../menu-management.html'), 'utf8');
function source(html, name) {
    const start = html.lastIndexOf(`        function ${name}(`);
    assert.ok(start >= 0, name);
    const end = html.indexOf('\n        function ', start + 1);
    // Functions under test are followed by another declaration.
    return html.slice(start, end);
}
function context(html, names, globals) {
    const sandbox = vm.createContext(globals);
    names.forEach(name => vm.runInContext(source(html, name), sandbox));
    return sandbox;
}
const keys = ['beans', 'syrup', 'sweetness', 'temperature', 'strength', 'cupsize', 'lid', 'latteArt'];
test('页面包含详情图输入、上传、恢复默认及分组排序控件', () => {
    for (const id of ['productDetailImage', 'productDetailImageFile', 'productDetailImagePreview']) assert.ok(detail.includes(`id="${id}"`));
    assert.ok(detail.includes('onclick="resetProductDetailImage()"'));
    assert.ok(detail.includes('class="drag-handle"'));
    assert.ok(detail.includes('draggable="true"'));
    assert.ok(!detail.includes('class="group-order-button"'));
    assert.ok(source(detail, 'collectProductDraftForSave').includes("detailImage: document.getElementById('productDetailImage')"));
    assert.ok(source(menu, 'renderOrderPreviewDetail').includes('product.detailImage || product.image'));
    assert.ok(menu.includes('escapePreviewText(product.image)'));
});
test('旧商品默认排序与点单屏一致；异常键及重复键被忽略；首尾不能越界', () => {
    const productData = {};
    const c = context(detail, ['normalizeOptionGroupOrder', 'getOrderedTagConfigs', 'moveOptionGroup'], {
        productData, tagConfigs: keys.map(specKey => ({specKey})), DEFAULT_OPTION_GROUP_ORDER: ['beans', 'syrup', 'sweetness', 'temperature', 'strength', 'cupsize', 'lid', 'latteArt'], renderTagTree() {}, document: {querySelector: () => null}
    });
    assert.deepEqual(Array.from(c.getOrderedTagConfigs(), x => x.specKey), ['beans', 'syrup', 'sweetness', 'temperature', 'strength', 'cupsize', 'lid', 'latteArt']);
    c.moveOptionGroup('beans', -1);
    assert.equal(productData.optionGroupOrder, undefined);
    c.moveOptionGroup('temperature', -1);
    assert.deepEqual(Array.from(productData.optionGroupOrder), ['beans', 'syrup', 'temperature', 'sweetness', ...keys.slice(4)]);
    const before = JSON.stringify(productData);
    c.moveOptionGroup('latteArt', 1);
    assert.equal(JSON.stringify(productData), before);
    productData.optionGroupOrder = ['temperature', 'temperature', 'unknown'];
    assert.deepEqual(Array.from(c.getOrderedTagConfigs(), x => x.specKey), ['temperature', 'beans', 'syrup', 'sweetness', 'strength', 'cupsize', 'lid', 'latteArt']);
    assert.deepEqual(Array.from(c.normalizeOptionGroupOrder(productData.optionGroupOrder, keys)), ['temperature', 'beans', 'syrup', 'sweetness', 'strength', 'cupsize', 'lid', 'latteArt']);
});
test('详情图默认跟随列表，独立图不跟随，恢复默认立即生效', () => {
    const elements = {
        productImage: {value: 'list-a.png'}, productDetailImage: {value: ''}, productDetailImageFile: {value: ''},
        productDetailImageStatus: {}, productDetailImagePreview: {replaceChildren() {this.child = null;}, appendChild(child) {this.child = child;}}
    };
    const c = context(detail, ['updateDetailImagePreview', 'resetProductDetailImage'], {
        document: {getElementById: id => elements[id], createElement: () => ({style: {}})}
    });
    c.updateDetailImagePreview();
    assert.equal(elements.productDetailImagePreview.child.src, 'list-a.png');
    elements.productDetailImage.value = 'detail.png';
    elements.productImage.value = 'list-b.png';
    c.updateDetailImagePreview();
    assert.equal(elements.productDetailImagePreview.child.src, 'detail.png');
    c.resetProductDetailImage();
    assert.equal(elements.productDetailImagePreview.child.src, 'list-b.png');
});
test('草稿传递图片和顺序且不写存储，重置详情图可覆盖旧值', () => {
    const productData = {id: 1, price: 12, optionGroupOrder: ['temperature', ...keys.filter(k => k !== 'temperature')]};
    const c = context(detail, ['normalizeOptionGroupOrder', 'buildOrderPreviewDraftPayload'], {
        productData, tagConfigs: keys.map(specKey => ({specKey})), DEFAULT_OPTION_GROUP_ORDER: ['beans', 'syrup', 'sweetness', 'temperature', 'strength', 'cupsize', 'lid', 'latteArt'], getDeviceLangs: () => [], cloneProductValue: value => value ? JSON.parse(JSON.stringify(value)) : value,
        document: {getElementById: id => ({productImage: {value: 'list.png'}, productDetailImage: {value: ''}}[id])}
    });
    const payload = c.buildOrderPreviewDraftPayload();
    assert.equal(payload.detailImage, null);
    assert.equal(payload.optionGroupOrder[0], 'temperature');
    const m = context(menu, ['normalizeOrderPreviewOptionGroupOrder', 'normalizeOrderPreviewDraftPayload', 'getOrderPreviewDisplayProduct', 'renderOrderPreviewDetailSections'], {
        cloneSharedMenuProducts: value => JSON.parse(JSON.stringify(value)), orderPreviewDraftPayload: null,
        DEFAULT_ORDER_PREVIEW_OPTION_GROUP_ORDER: ['beans', 'syrup', 'sweetness', 'temperature', 'strength', 'cupsize', 'lid', 'latteArt'],
        ORDER_PREVIEW_DETAIL_SECTION_CONFIG: keys.map(specKey => ({specKey, variant: specKey === 'beans' ? 'bean' : 'default'})),
        renderOrderPreviewBeanSection: () => 'beans|', renderOrderPreviewOptionSection: (p, key) => key + '|'
    });
    m.orderPreviewDraftPayload = m.normalizeOrderPreviewDraftPayload(payload);
    assert.deepEqual(Array.from(m.orderPreviewDraftPayload.optionGroupOrder), productData.optionGroupOrder);
    const original = {id: 1, image: 'old-list.png', detailImage: 'old-detail.png'};
    const merged = m.getOrderPreviewDisplayProduct(original);
    assert.equal(merged.detailImage, null);
    assert.equal(merged.image, 'list.png');
    assert.equal(original.detailImage, 'old-detail.png');
    assert.equal(m.renderOrderPreviewDetailSections(merged, 'zh'), productData.optionGroupOrder.join('|') + '|');
    const restored = JSON.parse(JSON.stringify(merged));
    assert.equal(m.renderOrderPreviewDetailSections(restored, 'en'), productData.optionGroupOrder.join('|') + '|');
});
test('拖拽只接受完整分组列表，取消拖动不提交，触屏取消会清理占位', () => {
    const productData = {optionGroupOrder: [...keys]};
    let rows = keys.map(specKey => ({dataset:{specKey}}));
    let resets = 0;
    let commits = 0;
    const c = context(detail, ['saveOptionGroupOrderByDom', 'handleOptionGroupDragEnd', 'handleOptionGroupTouchEnd'], {
        productData, getOrderedTagConfigs: () => keys.map(specKey => ({specKey})),
        document: {getElementById: () => ({querySelectorAll: () => rows})},
        resetOptionGroupDragState: () => resets++, commitOptionGroupDrag: () => commits++,
        optionGroupTouchDragState: {identifier: 1}, getOptionGroupTouchByIdentifier: () => ({identifier:1}), optionGroupIgnoreClickUntil: 0
    });
    rows = ['temperature', ...keys.filter(key => key !== 'temperature')].map(specKey => ({dataset:{specKey}}));
    c.saveOptionGroupOrderByDom();
    assert.equal(productData.optionGroupOrder[0], 'temperature');
    rows = [{dataset:{specKey:'beans'}}];
    c.saveOptionGroupOrderByDom();
    assert.equal(productData.optionGroupOrder.length, 8);
    c.handleOptionGroupDragEnd();
    c.handleOptionGroupTouchEnd({type:'touchcancel',preventDefault(){}});
    assert.equal(resets, 2);
    assert.equal(commits, 0);
    c.handleOptionGroupTouchEnd({type:'touchend',preventDefault(){}});
    assert.equal(commits, 1);
});
test('拖动提交按顺序放置节点、更新草稿、清理并重绘分组导航', () => {
    const calls = [];
    const c = context(detail, ['commitOptionGroupDrag'], {
        optionGroupIgnoreClickUntil:0, optionGroupDraggedElement:{},
        optionGroupDropPlaceholder:{parentNode:{insertBefore(){calls.push('place');}}},
        saveOptionGroupOrderByDom(){calls.push('save');},
        resetOptionGroupDragState(){calls.push('reset');},
        renderTagTree(){calls.push('render');}
    });
    c.commitOptionGroupDrag();
    assert.deepEqual(calls, ['place','save','reset','render']);
});
