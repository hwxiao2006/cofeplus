# Product Card Dual Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add unified `上架/下架 + 编辑` actions to each product card in menu management while keeping card-body navigation to product detail.

**Architecture:** Update the product-card render function to emit two explicit action buttons, then refine the shared card CSS so desktop and mobile both support the same interaction pattern with size-appropriate tap targets. Preserve existing sale-toggle and edit handlers.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node-based behavior tests.

---

### Task 1: Cover dual-button card rendering in tests

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`

**Step 1: Write the failing test**

Add a behavior test that renders an on-sale product card and asserts:
```js
const html = ctx.renderMenuManageProductCard(product, { categoryKey: '奶咖系列' });
assert.ok(html.includes('>下架<'));
assert.ok(html.includes('>编辑<'));
assert.ok(html.includes("toggleProductSale('奶咖系列', 2)"));
assert.ok(html.includes("editProduct('奶咖系列', 2)"));
```

Add a second assertion for an off-sale product:
```js
assert.ok(offHtml.includes('>上架<'));
```

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL because current card only renders `编辑`.

**Step 3: Write minimal implementation**

No implementation in this task.

**Step 4: Run test to verify it fails for the expected reason**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL at the new dual-action assertions.

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js
git commit -m "test: cover dual actions on product card"
```

### Task 2: Implement dual-button actions and responsive layout

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Test: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`

**Step 1: Use the failing test as the RED state**

**Step 2: Run test to verify it fails**

Run: `node tests/menu-management.behavior.test.js`
Expected: FAIL because `toggleProductSale` button is missing.

**Step 3: Write minimal implementation**

- Update `renderMenuManageProductCard()` to render both action buttons.
- Keep `event.stopPropagation()` on both buttons.
- Add compact desktop button layout and full-width mobile action row styling.
- Keep current status display text in the meta area.

**Step 4: Run test to verify it passes**

Run: `node tests/menu-management.behavior.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/menu-management.html /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js
git commit -m "feat: add dual product-card actions"
```

### Task 3: Full verification

**Files:**
- Verify only

**Step 1: Run full relevant verification**

Run: `node tests/menu-management.behavior.test.js && node tests/product-detail.pricing.test.js`
Expected: PASS.

**Step 2: Confirm clean result**

Review exit code 0 and no failing tests.

**Step 3: Commit if needed**

```bash
git add -A
git commit -m "chore: finalize product card dual action update"
```
