# Device Entry Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `device-entry.html` 升级为桌面两栏 + 移动单栏优化的双端适配布局，同时保持业务脚本兼容。

**Architecture:** 保持现有数据与交互逻辑不变，仅重构页面容器层次与 CSS 断点策略。通过新增 `form-grid`、`form-column` 与 `form-section` 组织结构，在桌面端实现分栏排布，在移动端回退单列，并增强输入、上传区与操作区可用性。

**Tech Stack:** 单文件 HTML + CSS + 原生 JS；Node.js `assert` 风格静态行为测试

---

### Task 1: 为响应式改造添加失败测试

**Files:**
- Create: `tests/device-entry.responsive.test.js`
- Test: `tests/device-entry.responsive.test.js`

**Step 1: Write the failing test**

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'device-entry.html'), 'utf8');

assert.ok(html.includes('class="form-grid"'));
assert.ok(html.includes('class="form-column left-column"'));
assert.ok(html.includes('class="form-column right-column"'));
assert.ok(html.includes('@media (max-width: 768px)'));
assert.ok(html.includes('batch') === false);
```

**Step 2: Run test to verify it fails**

Run: `node tests/device-entry.responsive.test.js`  
Expected: FAIL（尚未有 `form-grid` 等结构）

**Step 3: Commit failing test**

```bash
git add tests/device-entry.responsive.test.js
git commit -m "test: add failing checks for device-entry responsive layout"
```

**Step 4: Re-run to keep RED state visible**

Run: `node tests/device-entry.responsive.test.js`  
Expected: FAIL

**Step 5: Record failure reason**

```text
- missing form-grid container
- missing left/right columns
- missing mobile responsive overrides for new structure
```

### Task 2: 重构 HTML 为两栏容器结构

**Files:**
- Modify: `device-entry.html`
- Test: `tests/device-entry.responsive.test.js`

**Step 1: Wrap sections into form grid**

```html
<div class="form-grid">
  <div class="form-column left-column">...</div>
  <div class="form-column right-column">...</div>
</div>
```

**Step 2: Keep business IDs unchanged**

```html
<input id="deviceSearchInput" ...>
<select id="locationSelect" ...>
<input id="locationAddressInput" ...>
```

**Step 3: Place action buttons inside right column section**

```html
<section class="form-section actions-section">
  <div class="actions">...</div>
</section>
```

**Step 4: Run test to verify partial pass**

Run: `node tests/device-entry.responsive.test.js`  
Expected: 结构相关断言 PASS，样式断言可能仍 FAIL。

**Step 5: Commit HTML restructuring**

```bash
git add device-entry.html
git commit -m "feat: restructure device-entry into desktop two-column form sections"
```

### Task 3: 完成桌面样式与移动断点优化

**Files:**
- Modify: `device-entry.html`
- Test: `tests/device-entry.responsive.test.js`

**Step 1: Add desktop layout styles**

```css
.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr);
  gap: 18px;
}

.form-section {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
```

**Step 2: Add mobile fallback styles**

```css
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .row { flex-direction: column; align-items: stretch; }
  .value { text-align: left; }
  .value input, .value select { width: 100%; text-align: left; }
}
```

**Step 3: Improve upload and action ergonomics on mobile**

```css
@media (max-width: 768px) {
  .upload-grid { overflow-x: auto; }
  .actions { padding: 14px; }
}
```

**Step 4: Run test to verify pass**

Run: `node tests/device-entry.responsive.test.js`  
Expected: PASS

**Step 5: Commit style layer**

```bash
git add device-entry.html tests/device-entry.responsive.test.js
git commit -m "feat: add responsive desktop/mobile styles for device-entry"
```

### Task 4: 全量回归验证

**Files:**
- Test: `tests/device-entry.responsive.test.js`
- Test: `tests/*.test.js`

**Step 1: Run targeted test**

Run: `node tests/device-entry.responsive.test.js`  
Expected: PASS

**Step 2: Run all regression tests**

Run: `for f in tests/*.test.js; do node "$f"; done`  
Expected: 全部 PASS

**Step 3: Spot-check DOM IDs used by script**

Run: `rg -n "deviceSearchInput|locationSelect|locationAddressInput" device-entry.html`  
Expected: 关键 ID 均存在

**Step 4: Summarize verification evidence**

```text
- device-entry responsive test: PASS
- existing behavior tests: PASS
- script-bound IDs preserved
```

**Step 5: Final commit (if needed for docs/test artifacts)**

```bash
git add tests/device-entry.responsive.test.js device-entry.html
git commit -m "test: cover responsive layout contracts for device-entry"
```
