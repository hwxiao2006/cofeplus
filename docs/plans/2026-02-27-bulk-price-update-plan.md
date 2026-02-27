# 批量改固定价功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在菜单管理页新增“按分类手动勾选 + 全选”的批量改固定价，支持部分成功提交、失败保留并重试。

**Architecture:** 在 `menu-management.html` 内新增批量模式运行态与批量操作面板。渲染层按商品行注入勾选控件和执行结果态，提交层采用逐条处理，单条失败不阻塞后续。成功条目即时写回 `productsData` 与 `localStorage.menuProductEdits`，失败条目保留选中并记录错误原因。

**Tech Stack:** Vanilla HTML/CSS/JavaScript + Node.js (`assert` + `vm`) 页面脚本行为测试

---

### Task 1: 先写失败测试，锁定新业务规则

**Files:**
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write the failing test (DOM 契约 + 规则契约)**

```js
test('批量改价面板应包含固定价输入和失败重试入口', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'menu-management.html'), 'utf8');
  assert.ok(html.includes('toggleBatchFixedPriceMode()'));
  assert.ok(html.includes('id="batchFixedPricePanel"'));
  assert.ok(html.includes('id="batchFixedCurrentPrice"'));
  assert.ok(html.includes('id="batchFixedOriginalPrice"'));
  assert.ok(html.includes('id="batchFixedRetryBtn"'));
});

test('批量改固定价：原价留空应保持原价不变', () => {
  const ctx = loadMenuContext();
  const result = ctx.computeFixedPricePatch(
    { id: 1, price: 10, originalPrice: 12 },
    { currentPrice: 11, originalPrice: null }
  );
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.patch.price, 11);
  assert.strictEqual(result.patch.originalPrice, 12);
});

test('批量改固定价：填写原价但原价<=现价应失败', () => {
  const ctx = loadMenuContext();
  const result = ctx.validateBatchFixedPriceInput('10', '10');
  assert.strictEqual(result.ok, false);
  assert.ok(result.message.includes('原价需大于现价'));
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL，提示缺少 `toggleBatchFixedPriceMode` 或相关函数/DOM ID。

**Step 3: Commit failing tests**

```bash
git add tests/menu-management.behavior.test.js
git commit -m "test: add failing coverage for fixed batch pricing workflow"
```

**Step 4: Re-run to keep failure signal explicit**

Run: `node tests/menu-management.behavior.test.js`
Expected: 仍然 FAIL（实现尚未开始）。

**Step 5: Note failure checklist in commit body**

```text
- missing batch panel ids
- missing fixed-price validators
- missing per-row apply contract
```

### Task 2: 建立批量模式运行态与纯逻辑函数

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Write minimal state + pure helpers in script area**

```js
let isBatchFixedPriceMode = false;
let batchActiveCategory = '';
let batchSelectedIds = new Set();
let batchSuccessIds = new Set();
let batchFailedMap = {};

function validateBatchFixedPriceInput(currentRaw, originalRaw) {
  const currentPrice = Number(currentRaw);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return { ok: false, message: '请输入有效现价' };
  }

  if (originalRaw === '' || originalRaw === null || typeof originalRaw === 'undefined') {
    return { ok: true, currentPrice, originalPrice: null };
  }

  const originalPrice = Number(originalRaw);
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return { ok: false, message: '请输入有效原价' };
  }
  if (originalPrice <= currentPrice) {
    return { ok: false, message: '原价需大于现价' };
  }

  return { ok: true, currentPrice, originalPrice };
}

function computeFixedPricePatch(product, input) {
  const patch = { price: input.currentPrice };
  if (input.originalPrice !== null) patch.originalPrice = input.originalPrice;
  else if (Object.prototype.hasOwnProperty.call(product, 'originalPrice')) patch.originalPrice = product.originalPrice;
  return { ok: true, patch };
}
```

**Step 2: Run test to verify partial progress**

Run: `node tests/menu-management.behavior.test.js`
Expected: 纯函数相关失败减少，但 DOM/交互相关仍 FAIL。

**Step 3: Add defensive update helper for single product**

```js
function updateSingleProductFixedPrice(categoryKey, productId, input) {
  const category = productsData[categoryKey];
  if (!category) throw new Error('分类不存在');
  const item = category.items.find(p => p.id === productId);
  if (!item) throw new Error('商品不存在');

  const patchResult = computeFixedPricePatch(item, input);
  item.price = patchResult.patch.price;
  if (input.originalPrice !== null) item.originalPrice = patchResult.patch.originalPrice;
}
```

**Step 4: Run tests again**

Run: `node tests/menu-management.behavior.test.js`
Expected: 仍 FAIL（UI/提交流程未接线）。

**Step 5: Commit logic foundation**

```bash
git add menu-management.html
git commit -m "feat: add fixed batch pricing state and validators"
```

### Task 3: 增加批量模式 UI（入口、面板、状态样式）

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Add header action button and panel markup**

```html
<button class="action-btn secondary header-menu-action header-manage-action" onclick="toggleBatchFixedPriceMode()">
  <span>批量改价</span>
</button>

<section id="batchFixedPricePanel" class="batch-fixed-panel" style="display:none;">
  <select id="batchFixedCategorySelect"></select>
  <input id="batchFixedCurrentPrice" type="number" min="0" step="0.1" placeholder="现价">
  <input id="batchFixedOriginalPrice" type="number" min="0" step="0.1" placeholder="原价(可空)">
  <button id="batchFixedSubmitBtn" type="button" onclick="submitBatchFixedPriceUpdate()">提交改价</button>
  <button id="batchFixedRetryBtn" type="button" onclick="retryBatchFixedPriceFailures()">重试失败项</button>
</section>
```

**Step 2: Add CSS classes for row-level result feedback**

```css
.product-card.batch-success { border-color: #22c55e; box-shadow: 0 0 0 1px rgba(34,197,94,.35); }
.product-card.batch-failed { border-color: #ef4444; box-shadow: 0 0 0 1px rgba(239,68,68,.3); }
.batch-result-tag { font-size: 12px; font-weight: 600; }
.batch-result-tag.success { color: #15803d; }
.batch-result-tag.failed { color: #dc2626; }
```

**Step 3: Wire panel visibility with mode toggle**

```js
function toggleBatchFixedPriceMode() {
  isBatchFixedPriceMode = !isBatchFixedPriceMode;
  if (!isBatchFixedPriceMode) {
    batchSelectedIds = new Set();
    batchSuccessIds = new Set();
    batchFailedMap = {};
  }
  renderBatchFixedPricePanel();
  renderMenu();
}
```

**Step 4: Run tests to verify DOM contract**

Run: `node tests/menu-management.behavior.test.js`
Expected: DOM 契约测试 PASS，执行流测试可能仍 FAIL。

**Step 5: Commit UI skeleton**

```bash
git add menu-management.html
git commit -m "feat: add batch fixed pricing UI skeleton"
```

### Task 4: 在商品卡渲染中接入勾选、全选、成功/失败态

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Add selection controls in `renderMenu()` card template**

```js
const checked = batchSelectedIds.has(p.id) ? 'checked' : '';
const success = batchSuccessIds.has(p.id);
const failedReason = batchFailedMap[p.id] || '';

<div class="product-card ${success ? 'batch-success' : ''} ${failedReason ? 'batch-failed' : ''}" onclick="${isBatchFixedPriceMode ? 'toggleBatchProductSelection(' + p.id + ');event.stopPropagation();' : 'goToDetail(' + p.id + ')'}">
  ${isBatchFixedPriceMode ? `<label class="batch-check"><input type="checkbox" ${checked} onclick="event.stopPropagation();toggleBatchProductSelection(${p.id})"></label>` : ''}
  ...
  ${success ? '<span class="batch-result-tag success">修改成功</span>' : ''}
  ${failedReason ? `<span class="batch-result-tag failed">${failedReason}</span>` : ''}
</div>
```

**Step 2: Implement category-level select all helpers**

```js
function toggleBatchSelectAllInCategory(categoryKey, checked) {
  const category = productsData[categoryKey];
  if (!category) return;
  category.items.forEach(item => {
    if (checked) batchSelectedIds.add(item.id);
    else batchSelectedIds.delete(item.id);
  });
  renderBatchFixedPricePanel();
  renderMenu();
}
```

**Step 3: Ensure success items auto-unselect**

```js
function markBatchSuccess(productId) {
  batchSuccessIds.add(productId);
  batchSelectedIds.delete(productId);
  delete batchFailedMap[productId];
}
```

**Step 4: Run tests**

Run: `node tests/menu-management.behavior.test.js`
Expected: 选择态相关测试 PASS，提交/重试相关可能仍 FAIL。

**Step 5: Commit rendering integration**

```bash
git add menu-management.html
git commit -m "feat: integrate batch selection and row status into menu cards"
```

### Task 5: 实现逐条执行、部分成功提交与失败重试

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Add failing tests for partial success + retry**

```js
test('批量提交应允许部分成功，失败项保留选中', () => {
  const ctx = loadMenuContext();
  ctx.productsData = {
    A: { icon: '☕', items: [{ id: 1, price: 10, originalPrice: 12 }, { id: 2, price: 8, originalPrice: 9 }] }
  };
  ctx.isBatchFixedPriceMode = true;
  ctx.batchSelectedIds = new Set([1, 2]);

  ctx.updateSingleProductFixedPrice = (categoryKey, id, input) => {
    if (id === 2) throw new Error('模拟失败');
    const item = ctx.productsData.A.items.find(p => p.id === id);
    item.price = input.currentPrice;
  };

  const result = ctx.applyBatchFixedPriceBySelection('A', { currentPrice: 11, originalPrice: null });
  assert.strictEqual(result.successCount, 1);
  assert.strictEqual(result.failedCount, 1);
  assert.strictEqual(ctx.batchSelectedIds.has(1), false);
  assert.strictEqual(ctx.batchSelectedIds.has(2), true);
});
```

**Step 2: Implement `applyBatchFixedPriceBySelection`**

```js
function applyBatchFixedPriceBySelection(categoryKey, input) {
  const targetIds = Array.from(batchSelectedIds);
  let successCount = 0;
  let failedCount = 0;

  targetIds.forEach(productId => {
    try {
      updateSingleProductFixedPrice(categoryKey, productId, input);
      persistSingleProductEdit(productId);
      markBatchSuccess(productId);
      successCount += 1;
    } catch (error) {
      batchFailedMap[productId] = error && error.message ? error.message : '修改失败';
      failedCount += 1;
    }
  });

  return { successCount, failedCount };
}
```

**Step 3: Implement submit/retry handlers**

```js
function submitBatchFixedPriceUpdate() {
  const valid = validateBatchFixedPriceInput(
    document.getElementById('batchFixedCurrentPrice').value,
    document.getElementById('batchFixedOriginalPrice').value
  );
  if (!valid.ok) {
    showToast(valid.message, 'error');
    return;
  }
  if (!batchSelectedIds.size) {
    showToast('请先选择商品', 'error');
    return;
  }

  const result = applyBatchFixedPriceBySelection(batchActiveCategory, valid);
  showToast(`批量改价完成：成功 ${result.successCount}，失败 ${result.failedCount}`);
  renderBatchFixedPricePanel();
  renderMenu();
}

function retryBatchFixedPriceFailures() {
  const failedIds = Object.keys(batchFailedMap).map(Number);
  batchSelectedIds = new Set(failedIds);
  submitBatchFixedPriceUpdate();
}
```

**Step 4: Run tests and verify pass**

Run: `node tests/menu-management.behavior.test.js`
Expected: PASS（新增批量固定价测试通过，既有测试不回归）。

**Step 5: Commit submit flow**

```bash
git add menu-management.html tests/menu-management.behavior.test.js
git commit -m "feat: support partial-success fixed batch pricing with retry"
```

### Task 6: 回归验证、文档补充与交付

**Files:**
- Modify: `docs/plans/2026-02-27-bulk-price-update-design.md`
- Test: `tests/menu-management.behavior.test.js`
- Test: `tests/product-detail.pricing.test.js`

**Step 1: Add a short implementation note in design doc**

```md
## 11. 实施记录
- 已实现逐条提交与失败重试。
- 已实现成功项自动取消勾选与会话内成功高亮。
- 退出批量模式后清理成功高亮状态。
```

**Step 2: Run menu + product detail tests**

Run: `node tests/menu-management.behavior.test.js`
Expected: PASS

Run: `node tests/product-detail.pricing.test.js`
Expected: PASS

**Step 3: Run all current tests (smoke)**

Run: `for f in tests/*.test.js; do node "$f"; done`
Expected: 全部 PASS，无新增回归。

**Step 4: Final commit for docs and verification note**

```bash
git add docs/plans/2026-02-27-bulk-price-update-design.md docs/plans/2026-02-27-bulk-price-update-plan.md
git commit -m "docs: add bulk fixed pricing design and implementation plan"
```

**Step 5: Prepare review handoff**

```text
- 变更摘要：入口、面板、逐条执行、失败重试、行状态反馈
- 测试证据：menu-management.behavior + 全量 tests/*.test.js
- 风险点：大批量选择时渲染性能、本地存储容量
```
