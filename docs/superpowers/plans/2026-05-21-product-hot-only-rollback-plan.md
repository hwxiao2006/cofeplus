# Product Hot-Only Rollback Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current business-tag implementation on an archive branch, then make the production product-management line support only `featured / 是否热销`.

**Architecture:** Create an archive branch from the current business-tag state before any rollback. Do the actual rollback in a separate clean worktree based on the latest `origin/main`, so the current dirty workspace is not overwritten. Remove business-tag UI, helpers, persistence, tests, and PRD wording from the production branch while keeping recipe/spec tag features intact.

**Tech Stack:** Static HTML, inline browser JavaScript, shared mock data, `localStorage`, Node built-in tests, Cloudflare Pages PRD deploy via Wrangler.

---

## File Map

- Create branch: `codex/business-tags-archive`
  Purpose: Preserve the current business-tag implementation for later recovery.

- Create worktree: `/Users/mac/Documents/product-hot-only-worktree`
  Purpose: Clean implementation workspace based on `origin/main`.

- Modify: `menu-management.html`
  Purpose: Remove product-management business-tag settings, drawer, rendering, save/rollback logic, and restore hot-only product/order-preview display based on `featured`.

- Modify: `product-detail.html`
  Purpose: Remove business-tag product editor and business-tag persistence coordination, restore the `是否热销` field as the only product-level marketing flag.

- Modify: `shared/admin-mock-data.js`
  Purpose: Stop deriving and emitting `businessTagIds` in normalized products on the production branch; keep `featured`.

- Delete or stop referencing: `shared/business-tag-library.js`
  Purpose: Business-tag helper belongs to the archive branch, not the hot-only production branch.

- Modify: `tests/menu-management.behavior.test.js`
  Purpose: Replace business-tag expectations with hot-only expectations for product cards, basic settings, and order-preview UI.

- Modify: `tests/product-detail.pricing.test.js`
  Purpose: Replace `businessTagIds` save assertions with `featured` save assertions and verify the hot switch exists.

- Delete or rewrite: `tests/product-detail.business-tags.runtime.test.js`, `tests/shared.business-tag-library.runtime.test.js`
  Purpose: Business-tag behavior is out of production scope; archive branch keeps full coverage.

- Modify: `tests/shared.admin-mock-data.test.js`
  Purpose: Remove business-tag helper compatibility assertion and verify normalized products retain `featured` without requiring `businessTagIds`.

- Modify: `tests/product-detail.device-language-config.test.js`
  Purpose: Remove business-tag language blocking expectations while keeping genuine device-language tests.

- Modify: `tasks/prd-product-management-user-flow.md`
  Purpose: Replace business-tag requirements with hot-only requirements.

- Modify: `tasks/prd-product-management-user-flow.html`
  Purpose: Keep the deployed PRD HTML aligned with the markdown and current product scope.

- Modify: `tests/prd-product-management-user-flow-html.test.js`
  Purpose: Assert that the PRD does not contain business-tag scope and does contain hot-only scope.

---

## Chunk 1: Preserve Business Tags And Prepare Clean Worktree

### Task 1: Create the archive branch without disturbing the dirty workspace

**Files:**
- Branch: `codex/business-tags-archive`
- Test: `git branch --list codex/business-tags-archive`

- [ ] **Step 1: Confirm current workspace has the business-tag implementation**

Run:

```bash
git status --short
rg -n "业务标签|businessTagIds|business-tag-library" menu-management.html product-detail.html shared tests | head -n 80
```

Expected:
- `rg` finds business-tag implementation in the current workspace.
- `git status` may show unrelated dirty files; do not clean or reset them.

- [ ] **Step 2: Create or update the archive branch at the current HEAD**

Run:

```bash
git branch -f codex/business-tags-archive HEAD
git branch --list codex/business-tags-archive
```

Expected:
- `codex/business-tags-archive` exists.

Note:
- This preserves committed business-tag history. If uncommitted business-tag files must also be archived, handle Step 3.

- [ ] **Step 3: Preserve uncommitted business-tag files if they exist**

Run:

```bash
git status --short -- menu-management.html product-detail.html shared/admin-mock-data.js shared/business-tag-library.js tests/menu-management.behavior.test.js tests/product-detail.business-tags.runtime.test.js tests/product-detail.pricing.test.js tests/shared.business-tag-library.runtime.test.js tests/shared.admin-mock-data.test.js docs/superpowers/specs/2026-03-30-menu-management-multilingual-business-tags-design.md docs/superpowers/plans/2026-03-30-menu-management-multilingual-business-tags-implementation-plan.md
```

If this shows business-tag files as modified or untracked, archive them in a separate worktree to avoid staging unrelated files from the current workspace:

```bash
git worktree add /Users/mac/Documents/business-tags-archive-worktree codex/business-tags-archive
```

Then copy only business-tag files into that archive worktree and commit:

```bash
cp menu-management.html /Users/mac/Documents/business-tags-archive-worktree/
cp product-detail.html /Users/mac/Documents/business-tags-archive-worktree/
cp shared/admin-mock-data.js /Users/mac/Documents/business-tags-archive-worktree/shared/
cp shared/business-tag-library.js /Users/mac/Documents/business-tags-archive-worktree/shared/
cp tests/menu-management.behavior.test.js /Users/mac/Documents/business-tags-archive-worktree/tests/
cp tests/product-detail.business-tags.runtime.test.js /Users/mac/Documents/business-tags-archive-worktree/tests/
cp tests/product-detail.pricing.test.js /Users/mac/Documents/business-tags-archive-worktree/tests/
cp tests/shared.business-tag-library.runtime.test.js /Users/mac/Documents/business-tags-archive-worktree/tests/
cp tests/shared.admin-mock-data.test.js /Users/mac/Documents/business-tags-archive-worktree/tests/
mkdir -p /Users/mac/Documents/business-tags-archive-worktree/docs/superpowers/specs /Users/mac/Documents/business-tags-archive-worktree/docs/superpowers/plans
cp docs/superpowers/specs/2026-03-30-menu-management-multilingual-business-tags-design.md /Users/mac/Documents/business-tags-archive-worktree/docs/superpowers/specs/
cp docs/superpowers/plans/2026-03-30-menu-management-multilingual-business-tags-implementation-plan.md /Users/mac/Documents/business-tags-archive-worktree/docs/superpowers/plans/
cd /Users/mac/Documents/business-tags-archive-worktree
git add menu-management.html product-detail.html shared/admin-mock-data.js shared/business-tag-library.js tests/menu-management.behavior.test.js tests/product-detail.business-tags.runtime.test.js tests/product-detail.pricing.test.js tests/shared.business-tag-library.runtime.test.js tests/shared.admin-mock-data.test.js docs/superpowers/specs/2026-03-30-menu-management-multilingual-business-tags-design.md docs/superpowers/plans/2026-03-30-menu-management-multilingual-business-tags-implementation-plan.md
git commit -m "archive: preserve business tag implementation"
```

Expected:
- Archive branch contains a commit with the full business-tag implementation.
- No unrelated dirty files are staged in `/Users/mac/Documents/New project 4`.

### Task 2: Create the hot-only implementation worktree from latest production main

**Files:**
- Worktree: `/Users/mac/Documents/product-hot-only-worktree`
- Branch: `codex/product-hot-only`

- [ ] **Step 1: Refresh production main**

Run:

```bash
git fetch origin main --prune
git show --oneline -1 origin/main
```

Expected:
- `origin/main` is current; at the time of plan creation it was `b752612`.

- [ ] **Step 2: Create the clean worktree**

Run:

```bash
git worktree add -B codex/product-hot-only /Users/mac/Documents/product-hot-only-worktree origin/main
```

Expected:
- New clean worktree exists at `/Users/mac/Documents/product-hot-only-worktree`.
- Branch `codex/product-hot-only` is based on `origin/main`.

- [ ] **Step 3: Confirm clean status**

Run:

```bash
cd /Users/mac/Documents/product-hot-only-worktree
git status --short
```

Expected:
- No output.

---

## Chunk 2: Restore Hot-Only Runtime Behavior

### Task 3: Write failing menu-management hot-only tests

**Files:**
- Modify: `tests/menu-management.behavior.test.js`
- Test: `node --test tests/menu-management.behavior.test.js`

- [ ] **Step 1: Replace business-tag render tests with hot-only expectations**

In `tests/menu-management.behavior.test.js`, remove or rewrite tests named like:

- `点单屏预览：业务标签应显示前两个启用标签并隐藏停用标签`
- `点单屏预览：切换语言后业务标签文案应同步`
- `基础设置：应提供紧凑业务标签管理卡片，并只展示启用中和已隐藏统计`
- `菜单管理商品卡片：业务标签应叠加在商品图片上方`
- `菜单管理商品卡片：业务标签应悬浮在商品图右上角，不占用正文布局`
- `基础设置：设备无可见语言时应阻止保存业务标签改动`
- `基础设置：保存业务标签失败时应回滚基础设置快照并保持抽屉打开`

Add focused tests:

```js
test('菜单管理商品卡片：仅根据 featured 展示热销标识', () => {
  const ctx = loadMenuContext();
  const hotProduct = {
    id: 9001,
    price: 9.9,
    featured: true,
    businessTagIds: ['tag_new'],
    names: { zh: '热销测试商品' },
    descs: { zh: '测试描述' }
  };
  const normalProduct = {
    ...hotProduct,
    id: 9002,
    featured: false,
    names: { zh: '普通测试商品' }
  };

  const hotHtml = ctx.renderProductCard(hotProduct);
  const normalHtml = ctx.renderProductCard(normalProduct);

  assert.ok(hotHtml.includes('热销'));
  assert.ok(!hotHtml.includes('tag_new'));
  assert.ok(!normalHtml.includes('热销'));
});

test('基础设置：不再展示业务标签管理入口', () => {
  const html = fs.readFileSync(menuPath, 'utf8');

  assert.ok(!html.includes('业务标签管理'));
  assert.ok(!html.includes('businessTagSettingsSummary'));
  assert.ok(!html.includes('businessTagManagerDrawer'));
});

test('点单屏预览：仅根据 featured 展示热销标识', () => {
  const ctx = loadMenuContext();
  const products = [{
    id: 9101,
    price: 9.9,
    featured: true,
    businessTagIds: ['tag_new'],
    names: { zh: '热销预览商品' },
    descs: { zh: '测试描述' }
  }];

  ctx.currentOrderPreviewCategoryId = 'all';
  const html = ctx.renderOrderPreviewProducts(products);

  assert.ok(html.includes('热销'));
  assert.ok(!html.includes('tag_new'));
  assert.ok(!html.includes('business-tag'));
});
```

Adjust helper names if the harness exposes `renderProductCard` or `renderOrderPreviewProducts` under `ctx.window` rather than directly.

- [ ] **Step 2: Run the menu test to verify RED**

Run:

```bash
node --test tests/menu-management.behavior.test.js
```

Expected:
- FAIL because business-tag UI and rendering still exist.

### Task 4: Implement menu-management hot-only rollback

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Test: `node --test tests/menu-management.behavior.test.js`

- [ ] **Step 1: Remove the business-tag helper script load**

In `menu-management.html`, remove:

```html
<script src="shared/business-tag-library.js"></script>
```

If the test harness manually loads `shared/business-tag-library.js`, remove that harness load from `tests/menu-management.behavior.test.js`.

- [ ] **Step 2: Remove business-tag settings markup**

Delete the basic settings card containing:

```html
业务标签管理
businessTagSettingsSummary
businessTagManagerDrawer
```

Keep the other basic setting cards: device languages, contact info, and currency.

- [ ] **Step 3: Remove business-tag manager JavaScript**

Delete functions and state dedicated to the global business-tag library:

- `businessTagManagerDraft`
- `getBusinessTagLibrary`
- `setBusinessTagLibrary`
- `cloneBusinessTagLibrary`
- `renderBusinessTagSettingsSummary`
- `renderBusinessTagManager`
- `openBusinessTagManager`
- `closeBusinessTagManager`
- `beginCreateBusinessTag`
- `beginEditBusinessTag`
- `hideBusinessTag`
- `restoreBusinessTag`
- `saveMenuBasicSettings` branches that snapshot or rollback tag library changes

Do not delete recipe/spec tag code if it is unrelated to product business tags.

- [ ] **Step 4: Replace product card tag rendering with featured rendering**

Find the product-card rendering block using:

```js
const businessTagHtml = renderBusinessTagList(product, currentLang, ...)
```

Replace it with a simple featured badge:

```js
const featuredHtml = product.featured
  ? '<div class="product-card-badges"><span class="product-card-badge hot">热销</span></div>'
  : '';
```

Use existing class names if `origin/main` already has a hot badge style. If no exact class exists, add minimal CSS near product card badge styles:

```css
.product-card-badges {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 6px;
    z-index: 2;
}
.product-card-badge.hot {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    background: #f97316;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
}
```

- [ ] **Step 5: Replace order-preview business tags with featured**

Find order-preview rendering that calls business-tag helpers. Replace with:

```js
const featuredBadge = product.featured
  ? '<span class="order-preview-featured-badge">热销</span>'
  : '';
```

Keep existing product name, price, language, and detail preview behavior.

- [ ] **Step 6: Stop writing `businessTagIds` during copy/create flows**

In product copy and product normalization logic inside `menu-management.html`, remove `businessTagIds` assignments from new copied products.

Keep:

```js
featured: Boolean(source.featured)
```

or the existing equivalent.

- [ ] **Step 7: Run menu tests to verify GREEN**

Run:

```bash
node --test tests/menu-management.behavior.test.js
```

Expected:
- PASS for rewritten hot-only expectations.

- [ ] **Step 8: Commit menu rollback**

Run:

```bash
git add menu-management.html tests/menu-management.behavior.test.js
git commit -m "fix(menu): restore hot-only product badge behavior"
```

### Task 5: Write failing product-detail hot-only tests

**Files:**
- Modify: `tests/product-detail.pricing.test.js`
- Modify: `tests/product-detail.device-language-config.test.js`
- Delete or rewrite: `tests/product-detail.business-tags.runtime.test.js`
- Test: `node --test tests/product-detail.pricing.test.js tests/product-detail.device-language-config.test.js`

- [ ] **Step 1: Replace pricing tests that expect business tags**

In `tests/product-detail.pricing.test.js`, replace tests asserting:

- business-tag editor exists
- `saveProduct` persists ordered `businessTagIds`
- shared business-tag helper is loaded
- legacy `featured` materializes `tag_signature`

With:

```js
test('商品编辑表单应包含是否热销开关并不包含业务标签编辑区', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('id="featuredSwitch"'));
  assert.ok(html.includes('是否热销'));
  assert.ok(!html.includes('业务标签编辑'));
  assert.ok(!html.includes('productBusinessTagEditorModal'));
  assert.ok(!html.includes('shared/business-tag-library.js'));
});

test('saveProduct 应持久化 featured 而不是 businessTagIds', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(/featured:\s*document\.getElementById\('featuredSwitch'\)\.checked/.test(html));
  assert.ok(!/businessTagIds:\s*mergedBusinessTagIds/.test(html));
  assert.ok(!/businessTagIds:\s*selectedBusinessTagIds/.test(html));
});
```

- [ ] **Step 2: Remove business-tag device-language blocking test**

In `tests/product-detail.device-language-config.test.js`, remove the test named:

```js
商品详情页业务标签编辑在设备无可见语言时应进入阻断态
```

Keep tests for genuine device-language behavior outside business tags.

- [ ] **Step 3: Remove product-detail business-tag runtime test file**

If the file only covers business tags, delete it:

```bash
git rm tests/product-detail.business-tags.runtime.test.js
```

If it contains reusable non-business-tag harness logic, move that logic into remaining tests before deleting.

- [ ] **Step 4: Run product-detail tests to verify RED**

Run:

```bash
node --test tests/product-detail.pricing.test.js tests/product-detail.device-language-config.test.js
```

Expected:
- FAIL because product detail still contains business-tag editor and save logic.

### Task 6: Implement product-detail hot-only rollback

**Files:**
- Modify: `product-detail.html`
- Modify: `tests/product-detail.pricing.test.js`
- Modify: `tests/product-detail.device-language-config.test.js`
- Delete: `tests/product-detail.business-tags.runtime.test.js`
- Test: `node --test tests/product-detail.pricing.test.js tests/product-detail.device-language-config.test.js`

- [ ] **Step 1: Remove business-tag helper load**

In `product-detail.html`, remove:

```html
<script src="shared/business-tag-library.js"></script>
```

- [ ] **Step 2: Replace business-tag form section with featured switch**

Find the form block containing:

```html
<label class="form-label">业务标签</label>
```

Replace it with:

```html
<div class="form-group">
    <label class="form-label" for="featuredSwitch">是否热销</label>
    <label class="switch">
        <input type="checkbox" id="featuredSwitch">
        <span class="slider"></span>
    </label>
</div>
```

If this repository uses a different existing switch class, reuse it instead of inventing a new one.

- [ ] **Step 3: Remove business-tag editor modal and styles**

Delete markup and CSS for:

- `productBusinessTagEditorModal`
- `productBusinessTagSummary`
- `business-tag-editor-*`
- business-tag selected/library panes

Do not remove recipe/tag-group drawers or recipe option tag configuration.

- [ ] **Step 4: Remove business-tag JavaScript state and helpers**

Delete product business-tag functions and variables:

- `selectedBusinessTagIds`
- `businessTagLibraryDraft`
- `normalizeBusinessTagIds`
- `getProductBusinessTagIds`
- `renderProductBusinessTagSummary`
- `openProductBusinessTagEditor`
- `closeProductBusinessTagEditor`
- `moveSelectedBusinessTag`
- `toggleProductBusinessTag`
- `createBusinessTag`
- `applyProductBusinessTagSelection`
- `commitProductBusinessTags`
- any save rollback path only serving business tags

Keep recipe tag and tag option i18n functions.

- [ ] **Step 5: Initialize featured switch from product data**

In the product form population logic, add:

```js
const featuredSwitch = document.getElementById('featuredSwitch');
if (featuredSwitch) {
    featuredSwitch.checked = Boolean(productData.featured);
}
```

- [ ] **Step 6: Save featured and do not save businessTagIds**

In `saveProduct()`, ensure the saved product includes:

```js
featured: document.getElementById('featuredSwitch').checked,
```

Remove `businessTagIds` from the saved object.

- [ ] **Step 7: Make legacy `businessTagIds` read-only compatibility non-UI**

If old cached products are loaded with `businessTagIds`, ignore them for UI. Only use `featured` to initialize the switch.

If `featured` is absent and compatibility is needed, use a helper local to product-detail:

```js
function resolveFeaturedFlag(product) {
    if (typeof product?.featured === 'boolean') return product.featured;
    const legacyIds = Array.isArray(product?.businessTagIds) ? product.businessTagIds : [];
    return legacyIds.includes('tag_signature') || legacyIds.includes('tag_hot');
}
```

Then initialize the switch with `resolveFeaturedFlag(productData)`.

- [ ] **Step 8: Run product-detail tests to verify GREEN**

Run:

```bash
node --test tests/product-detail.pricing.test.js tests/product-detail.device-language-config.test.js
```

Expected:
- PASS.

- [ ] **Step 9: Commit product-detail rollback**

Run:

```bash
git add product-detail.html tests/product-detail.pricing.test.js tests/product-detail.device-language-config.test.js
git add -u tests/product-detail.business-tags.runtime.test.js
git commit -m "fix(product-detail): restore featured hot flag editing"
```

---

## Chunk 3: Remove Shared Business-Tag Production Contracts

### Task 7: Write failing shared-data hot-only tests

**Files:**
- Modify: `tests/shared.admin-mock-data.test.js`
- Delete: `tests/shared.business-tag-library.runtime.test.js`
- Test: `node --test tests/shared.admin-mock-data.test.js`

- [ ] **Step 1: Remove business-tag helper compatibility test**

In `tests/shared.admin-mock-data.test.js`, remove the test named:

```js
共享 mock 业务标签应保持 disabled 兼容输入并可被 helper 规范化为 hidden
```

Add:

```js
test('共享 mock 商品应保留 featured 并不要求业务标签字段', () => {
  const data = loadSharedMockData();
  const products = data.defaultProducts || [];

  assert.ok(products.some(product => product.featured === true), 'expected at least one hot product');
  assert.ok(products.some(product => product.featured === false), 'expected at least one non-hot product');
  assert.ok(products.every(product => !Object.prototype.hasOwnProperty.call(product, 'businessTagIds')), 'normalized mock products should not require businessTagIds');
});
```

Adjust `loadSharedMockData()` based on the existing helper in this test file.

- [ ] **Step 2: Delete the shared business-tag runtime test**

Run:

```bash
git rm tests/shared.business-tag-library.runtime.test.js
```

- [ ] **Step 3: Run shared tests to verify RED**

Run:

```bash
node --test tests/shared.admin-mock-data.test.js
```

Expected:
- FAIL because shared mock still emits `businessTagIds` and exposes business-tag defaults.

### Task 8: Remove production business-tag shared helper and mock output

**Files:**
- Modify: `shared/admin-mock-data.js`
- Delete: `shared/business-tag-library.js`
- Modify: `tests/shared.admin-mock-data.test.js`
- Delete: `tests/shared.business-tag-library.runtime.test.js`
- Test: `node --test tests/shared.admin-mock-data.test.js`

- [ ] **Step 1: Remove `businessTagIds` normalization**

In `shared/admin-mock-data.js`, remove:

- `SHARED_DEFAULT_BUSINESS_TAGS`
- `normalizeBusinessTagIds`
- `derivedBusinessTagIds`
- `businessTagIds` from normalized product output
- `defaultBusinessTags` from exported mock data

Keep `featured`.

- [ ] **Step 2: Delete helper file**

Run:

```bash
git rm shared/business-tag-library.js
```

- [ ] **Step 3: Ensure no production references remain**

Run:

```bash
rg -n "businessTag|business-tag-library|业务标签管理|业务标签" menu-management.html product-detail.html shared tests
```

Expected:
- No matches for product business tags.
- If matches remain in unrelated historical docs, ignore only if outside production/runtime/test files.

- [ ] **Step 4: Run shared tests to verify GREEN**

Run:

```bash
node --test tests/shared.admin-mock-data.test.js
```

Expected:
- PASS.

- [ ] **Step 5: Commit shared cleanup**

Run:

```bash
git add shared/admin-mock-data.js tests/shared.admin-mock-data.test.js
git add -u shared/business-tag-library.js tests/shared.business-tag-library.runtime.test.js
git commit -m "fix(shared): remove business tag production contracts"
```

---

## Chunk 4: PRD, Full Regression, And Deployment

### Task 9: Write failing PRD tests for hot-only scope

**Files:**
- Modify: `tests/prd-product-management-user-flow-html.test.js`
- Test: `node --test tests/prd-product-management-user-flow-html.test.js`

- [ ] **Step 1: Add PRD hot-only assertions**

In `tests/prd-product-management-user-flow-html.test.js`, add:

```js
assert.ok(html.includes('是否热销'), 'PRD should describe the hot-only product flag');
assert.ok(!html.includes('业务标签管理'), 'PRD should not include business tag management');
assert.ok(!html.includes('业务标签通过独立抽屉管理'), 'PRD should not include business tag drawer behavior');
assert.ok(!html.includes('业务标签多语言'), 'PRD should not include business tag multilingual scope');
```

- [ ] **Step 2: Run PRD test to verify RED**

Run:

```bash
node --test tests/prd-product-management-user-flow-html.test.js
```

Expected:
- FAIL because PRD still contains business-tag wording.

### Task 10: Update product-management PRD to hot-only scope

**Files:**
- Modify: `tasks/prd-product-management-user-flow.md`
- Modify: `tasks/prd-product-management-user-flow.html`
- Modify: `tests/prd-product-management-user-flow-html.test.js`
- Test: `node --test tests/prd-product-management-user-flow-html.test.js`

- [ ] **Step 1: Update markdown PRD**

In `tasks/prd-product-management-user-flow.md`, replace business-tag wording:

- Basic settings scope becomes device language, contact info, and currency.
- Product edit scope becomes image, category, price, status, and `是否热销`.
- Product cards and order preview describe only hot badge display based on `featured`.
- Remove hidden/restore business-tag acceptance criteria.

Use wording:

```markdown
当前商品管理只支持“是否热销”这一商品级营销标识；业务标签管理不纳入本次提测范围，相关实现保留在归档分支。
```

- [ ] **Step 2: Update standalone HTML PRD**

Mirror the same wording in `tasks/prd-product-management-user-flow.html`.

Do not change unrelated screenshots unless the screenshot itself visibly contradicts the hot-only scope. If a screenshot shows business-tag UI, replace or remove that figure reference.

- [ ] **Step 3: Run PRD test to verify GREEN**

Run:

```bash
node --test tests/prd-product-management-user-flow-html.test.js
```

Expected:
- PASS.

- [ ] **Step 4: Commit PRD update**

Run:

```bash
git add tasks/prd-product-management-user-flow.md tasks/prd-product-management-user-flow.html tests/prd-product-management-user-flow-html.test.js
git commit -m "docs(product): mark hot-only product management scope"
```

### Task 11: Run targeted regression suite

**Files:**
- Test only.

- [ ] **Step 1: Run product-management focused tests**

Run:

```bash
node --test \
  tests/menu-management.behavior.test.js \
  tests/menu-management.category-reorder.test.js \
  tests/menu-management.shared-source.test.js \
  tests/product-detail.pricing.test.js \
  tests/product-detail.device-language-config.test.js \
  tests/product-detail.tag-desc-i18n.test.js \
  tests/product-detail.tag-group-i18n.test.js \
  tests/shared.admin-mock-data.test.js \
  tests/prd-product-management-user-flow-html.test.js
```

Expected:
- PASS.

- [ ] **Step 2: Run full suite if targeted tests pass**

Run:

```bash
node --test tests/
```

Expected:
- PASS, or only unrelated failures documented with file/test names and reason.

### Task 12: Manual browser smoke test

**Files:**
- Runtime only.

- [ ] **Step 1: Start local no-cache server**

Run:

```bash
python3 scripts/no_cache_http_server.py --port 8080
```

Expected:
- Local server is available at `http://localhost:8080`.

- [ ] **Step 2: Smoke test product management**

Open:

```text
http://localhost:8080/menu-management.html
```

Verify:

- 商品卡片 hot products show `热销`.
- Non-hot products do not show a business-tag chip.
- 基本设置 has no `业务标签管理`.
- 点单屏预览 hot products show only hot status, not multi-tag chips.

- [ ] **Step 3: Smoke test product detail**

Open a product detail route used by the app, or click `编辑` from product management.

Verify:

- 商品详情 shows `是否热销`.
- No business-tag selector/editor modal is available.
- Saving preserves the hot switch state.
- Recipe/spec tag configuration still works where present.

### Task 13: Deploy PRD after verification

**Files:**
- Deploy: `prd-site/`

- [ ] **Step 1: Copy PRD artifacts to deploy directory**

Run:

```bash
mkdir -p prd-site/tasks prd-site/screenshots
cp tasks/prd-product-management-user-flow.html prd-site/tasks/
cp tasks/prd-product-management-user-flow.md prd-site/tasks/
cp tasks/prd-copy-product-flow.html prd-site/tasks/
cp -R screenshots/product-prd prd-site/screenshots/
```

- [ ] **Step 2: Deploy PRD site**

Run:

```bash
set -a
source .env
set +a
HOME="$PWD/.tmp-wrangler-home" npm_config_cache="$PWD/.tmp-npm-cache" npx wrangler pages deploy prd-site --project-name cofeplus-prd --branch main --commit-dirty=true
```

Expected:
- Wrangler reports deployment complete.

- [ ] **Step 3: Verify online PRD content**

Run:

```bash
curl -fsSL https://prd.cofeplus.dpdns.org/tasks/prd-product-management-user-flow | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{if(!s.includes('是否热销')){console.error('missing hot scope');process.exit(1)} if(s.includes('业务标签管理')){console.error('business tag scope still present');process.exit(1)} console.log('online PRD hot-only scope verified')})"
```

Expected:
- `online PRD hot-only scope verified`

### Task 14: Final branch and PR preparation

**Files:**
- Git only.

- [ ] **Step 1: Confirm archive and implementation branches**

Run:

```bash
git branch --list codex/business-tags-archive codex/product-hot-only
```

Expected:
- Both branches exist.

- [ ] **Step 2: Confirm implementation branch status**

Run in `/Users/mac/Documents/product-hot-only-worktree`:

```bash
git status --short
git log --oneline --decorate -n 8
```

Expected:
- Clean worktree except ignored generated deploy cache if any.
- Commits show hot-only rollback work on top of `origin/main`.

- [ ] **Step 3: Push branches if requested**

Run:

```bash
git push origin codex/business-tags-archive
git push origin codex/product-hot-only
```

Expected:
- Both branches are available remotely.

- [ ] **Step 4: Summarize completion**

Final response must include:

- Archive branch name.
- Implementation branch name.
- Tests run and results.
- PRD URL if deployed.
- Any unresolved risks or unrelated test failures.
