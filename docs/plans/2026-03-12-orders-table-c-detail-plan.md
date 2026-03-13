# Orders Table Variant C Detail Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the multi-variant order-table preview with a single refined Variant C preview that shows only the first product inline and opens a floating popover from `+N件` to reveal all products.

**Architecture:** Keep the work isolated to the standalone preview artifact and its focused regression test. Update the test first, then rewrite the preview page into a single desktop table workspace with frozen right-side columns, a compact two-line product cell, and a small client-side popover interaction for full product detail.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node-based regression test.

---

### Task 1: Lock the refined Variant C behavior with a failing test

**Files:**
- Modify: `tests/orders.redesign-preview.test.js`
- Test: `tests/orders.redesign-preview.test.js`

**Step 1: Write the failing test**
- Change the title expectation to a single Variant C preview title.
- Assert the page contains only the C variant heading and no A/B headings.
- Assert the table still exposes the main row fields:
  - 订单号
  - 时间
  - 商品
  - 门店
  - 设备
  - 取货码
  - 状态
  - 金额
  - 操作
- Assert the product pattern includes a `+N件` trigger.
- Assert the markup contains popover trigger and popover container selectors.
- Assert the page includes a two-line option detail container for the first product.

**Step 2: Run test to verify it fails**
Run: `node tests/orders.redesign-preview.test.js`
Expected: FAIL because the current preview still renders A/B/C comparison content.

**Step 3: Write minimal implementation**
- No implementation in this task.

**Step 4: Run test to verify it still fails for the intended reason**
Run: `node tests/orders.redesign-preview.test.js`
Expected: FAIL on missing single-variant C requirements only.

### Task 2: Rewrite the standalone preview page to refined Variant C

**Files:**
- Modify: `orders-redesign-preview.html`
- Test: `tests/orders.redesign-preview.test.js`

**Step 1: Write the failing implementation target**
- Update the preview title and introductory copy to reflect a single refined Variant C.
- Remove the A/B comparison sections.
- Keep a desktop-first table workspace with frozen right-side columns.

**Step 2: Run test to verify the current preview still fails**
Run: `node tests/orders.redesign-preview.test.js`
Expected: FAIL until the HTML is rewritten.

**Step 3: Write minimal implementation**
- Build one refined Variant C preview section.
- Render product cells with:
  - first-product name
  - clickable `+N件`
  - second-line option details clamped to two lines
- Add floating popover markup and minimal JavaScript to:
  - open from `+N件`
  - render full product list
  - dismiss on close or outside click
- Preserve stable status, amount, and action alignment in the frozen right zone.

**Step 4: Run test to verify it passes**
Run: `node tests/orders.redesign-preview.test.js`
Expected: PASS.

### Task 3: Run focused verification

**Files:**
- Modify: none unless regressions are found
- Test: `tests/orders.redesign-preview.test.js`

**Step 1: Run focused preview regression**
Run: `node tests/orders.redesign-preview.test.js`
Expected: PASS.

**Step 2: Run script syntax sanity check**
Run: `node -e "const fs=require('fs');const html=fs.readFileSync('orders-redesign-preview.html','utf8');const m=html.match(/<script>([\\s\\S]*)<\\/script>/); if(m){ new Function(m[1]); } console.log('SCRIPT_OK');"`
Expected: `SCRIPT_OK`

**Step 3: Re-run both checks after any fix**
Run: `node tests/orders.redesign-preview.test.js && node -e "const fs=require('fs');const html=fs.readFileSync('orders-redesign-preview.html','utf8');const m=html.match(/<script>([\\s\\S]*)<\\/script>/); if(m){ new Function(m[1]); } console.log('SCRIPT_OK');"`
Expected: PASS and `SCRIPT_OK`.
