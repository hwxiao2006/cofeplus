# Product Order And Business Tags Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-category product ordering and global multilingual business tags, while removing the old featured-product flow and replacing its customer-facing display with business tags.

**Architecture:** Keep the existing `productsData[categoryKey].items[]` shape and use array order as the source of truth for category-local product ordering. Introduce a shared business-tag library plus ordered `businessTagIds` on each product, then reuse the current same-ID synchronization flow so product-level tag edits propagate across duplicate category instances.

**Tech Stack:** Static HTML pages, vanilla JavaScript state/rendering, shared mock data, Node behavior tests.

## Implementation Status

- Date: 2026-03-25
- Status: Implemented in the local feature branch
- Delivered scope:
  - menu-management business-tag workflow and current-category product ordering
  - product-detail business-tag editing and ordered `businessTagIds` persistence
  - legacy `menu.html` and `overview.html` cleanup for removed featured-product stats, controls, and badges
  - regression coverage for legacy featured cleanup in `tests/legacy-featured-cleanup.test.js`
- Verified with:
  - `node --test tests/legacy-featured-cleanup.test.js`
  - `node --test tests/menu-management.behavior.test.js`
  - `node --test tests/menu-management.category-reorder.test.js`
  - `node --test tests/product-detail.pricing.test.js`
  - `node --test tests/shared.admin-mock-data.test.js`

---

### Task 1: Lock the new scope with failing tests

**Files:**
- Modify: `tests/menu-management.behavior.test.js`
- Modify: `tests/product-detail.pricing.test.js`
- Test: `tests/menu-management.behavior.test.js`
- Test: `tests/product-detail.pricing.test.js`

**Step 1: Write the failing menu-management tests**

Add coverage for:
- top stats only rendering `商品总数` and `在售商品数`
- stats deduping by product ID
- order-preview product cards using business tags instead of `order-preview-featured-badge`
- disabled business tags being hidden in preview output

**Step 2: Write the failing product-detail tests**

Add coverage asserting:
- `featuredSwitch` no longer exists
- product basic info contains a business-tag editing area
- selected business tags are treated as ordered data, not a boolean flag

**Step 3: Run tests to verify they fail**

Run:
```bash
node tests/menu-management.behavior.test.js
node tests/product-detail.pricing.test.js
```

Expected: FAIL because featured UI and business-tag flows have not been replaced yet.

### Task 2: Add the shared business-tag data model

**Files:**
- Modify: `shared/admin-mock-data.js`
- Modify: `menu-management.html`
- Modify: `product-detail.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Add mock business-tag library data**

Extend the shared mock dataset with a global business-tag library, including multilingual names and `active` / `disabled` status.

**Step 2: Add product-level tag fields**

Add ordered `businessTagIds` to representative mock products and make sure clones/defaults initialize this field to `[]`.

**Step 3: Add helper utilities**

Implement shared helpers for:
- resolving active business tags for a product
- formatting tag labels by language
- filtering out disabled tags
- cloning and syncing `businessTagIds` through existing same-ID update flows

**Step 4: Run focused tests**

Run:
```bash
node tests/menu-management.behavior.test.js
```

Expected: The new data model tests now pass or fail only on remaining UI work.

### Task 3: Remove featured-product controls and reduce the stats area

**Files:**
- Modify: `menu-management.html`
- Modify: `product-detail.html`
- Modify: `menu.html`
- Modify: `overview.html`
- Test: `tests/menu-management.behavior.test.js`
- Test: `tests/product-detail.pricing.test.js`

**Step 1: Remove featured editing controls**

Delete the `推荐商品` / `featured` switch UI from:
- product detail basic info
- menu-management product modal
- legacy `menu.html`
- legacy `overview.html`

Keep reading old `featured` data harmlessly if present, but stop editing or displaying it.

**Step 2: Reduce stats cards**

Update the menu-management stats strip so it only renders:
- `商品总数`
- `在售商品数`

Compute both by deduping products on `id` first.

**Step 3: Remove featured display badges**

Delete the featured badge CSS and render branches from product cards and order preview cards.

**Step 4: Run regression tests**

Run:
```bash
node tests/menu-management.behavior.test.js
node tests/product-detail.pricing.test.js
```

Expected: Featured-related tests are replaced by the new business-tag/stat expectations.

### Task 4: Build the business-tag editing experience

**Files:**
- Modify: `product-detail.html`
- Modify: `menu-management.html`
- Test: `tests/product-detail.pricing.test.js`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Add the business-tag module to product basic info**

Create a `业务标签` section in product detail basic info that shows current tags and an `编辑` entry.

**Step 2: Add tag selection and ordering UI**

Implement the editing flow so users can:
- multi-select global tags
- create a new tag
- edit an existing tag
- reorder selected tags

Keep the first selected tags as the display priority.

**Step 3: Persist business-tag updates**

Wire save flows so `businessTagIds` persist through product save/copy paths and sync to all same-ID products.

**Step 4: Run focused tests**

Run:
```bash
node tests/product-detail.pricing.test.js
node tests/menu-management.behavior.test.js
```

Expected: Product-detail and menu-management tests pass for tag editing state.

### Task 5: Replace customer-facing featured badges with business tags

**Files:**
- Modify: `menu-management.html`
- Test: `tests/menu-management.behavior.test.js`

**Step 1: Update menu-management product cards**

Render up to 2 active business tags on management product cards and show `+N` when more active tags remain.

**Step 2: Update order-preview product cards**

Render up to 2 active business tags under the product name, never show `+N`, and hide disabled tags.

**Step 3: Update order-preview product detail**

Render all active business tags in the summary area between the price block and description.

**Step 4: Run focused tests**

Run:
```bash
node tests/menu-management.behavior.test.js
```

Expected: Preview rendering tests pass for the new tag display rules.

### Task 6: Add current-category product ordering for desktop and mobile

**Files:**
- Modify: `menu-management.html`
- Modify: `tests/menu-management.behavior.test.js`
- Modify: `tests/menu-management.category-reorder.test.js`
- Test: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.category-reorder.test.js`

**Step 1: Write the failing ordering tests**

Add tests for:
- `调整商品顺序` entry only appearing in current-category mode
- desktop inline sorting state
- mobile full-screen sorting state
- saving current-category item order without affecting other categories

**Step 2: Implement sorting state and rendering**

Add desktop and mobile flows for entering product-order editing, dragging items, cancelling, and saving back to `productsData[categoryKey].items`.

**Step 3: Preserve non-ordering views**

Ensure `全部分类` view, product search, copy-product entry, and existing category navigation still work after exiting sort mode.

**Step 4: Run focused tests**

Run:
```bash
node tests/menu-management.category-reorder.test.js
node tests/menu-management.behavior.test.js
```

Expected: Current-category ordering passes on both desktop and mobile.

### Task 7: Full regression verification and commit

**Files:**
- Modify: `docs/plans/2026-03-25-product-order-business-tags-design.md`
- Modify: `docs/plans/2026-03-25-product-order-business-tags-plan.md`
- Test: `tests/menu-management.behavior.test.js`
- Test: `tests/menu-management.category-reorder.test.js`
- Test: `tests/product-detail.pricing.test.js`
- Test: `tests/shared.admin-mock-data.test.js`

**Step 1: Run the regression suite**

Run:
```bash
node tests/menu-management.behavior.test.js
node tests/menu-management.category-reorder.test.js
node tests/product-detail.pricing.test.js
node tests/shared.admin-mock-data.test.js
```

Expected: PASS.

**Step 2: Commit**

```bash
git add docs/plans/2026-03-25-product-order-business-tags-design.md docs/plans/2026-03-25-product-order-business-tags-plan.md menu-management.html product-detail.html menu.html overview.html shared/admin-mock-data.js tests/menu-management.behavior.test.js tests/menu-management.category-reorder.test.js tests/product-detail.pricing.test.js tests/shared.admin-mock-data.test.js
git commit -m "feat: add product order and business tag workflow"
```
