# Device Entry Detail Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让设备入场填写信息可在设备详情中查看，采用“核心字段默认展示 + 全字段折叠展开”的双层展示，并兼容桌面与移动端。

**Architecture:** 在 `device-entry.html` 的提交逻辑中构建并保存 `entryInfo`；在 `devices.html` 的 `viewDetail` 中增加入场信息渲染函数，先渲染核心字段，再渲染折叠的全字段。通过详情弹层复用实现双端一致展示。

**Tech Stack:** 单文件 HTML + 原生 JS + Node.js `assert` 测试

---

### Task 1: 新增失败测试覆盖入场信息详情可见性

**Files:**
- Create: `tests/devices.entry-detail.test.js`
- Test: `tests/devices.entry-detail.test.js`

**Step 1: Write the failing test**

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const deviceEntryHtml = fs.readFileSync(path.join(__dirname, '..', 'device-entry.html'), 'utf8');
const devicesHtml = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

assert.ok(deviceEntryHtml.includes('entryInfo'));
assert.ok(devicesHtml.includes('查看全部入场信息'));
assert.ok(devicesHtml.includes('device.entryInfo'));
```

**Step 2: Run test to verify it fails**

Run: `node tests/devices.entry-detail.test.js`
Expected: FAIL

### Task 2: 在入场提交时持久化 entryInfo

**Files:**
- Modify: `device-entry.html`
- Test: `tests/devices.entry-detail.test.js`

**Step 1: Add IDs/state hooks for form fields used in entryInfo**

**Step 2: Add helper to collect entry payload**

```js
function buildEntryInfoPayload() {
  return { entryAt: ..., locationName: ..., ... };
}
```

**Step 3: Persist payload in submit flow**

```js
device.entryInfo = buildEntryInfoPayload();
```

**Step 4: Run test to verify partial pass**

Run: `node tests/devices.entry-detail.test.js`
Expected: 入场保存断言 PASS，详情相关断言仍可能 FAIL。

### Task 3: 在设备详情中渲染核心字段 + 全字段折叠区

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.entry-detail.test.js`

**Step 1: Add render helpers for entryInfo rows**

```js
function renderEntryCoreRows(device, runtimeLocationMap) { ... }
function renderEntryAllRows(device) { ... }
```

**Step 2: Inject section into detail modal body**

```html
<details class="detail-entry-all">
  <summary>查看全部入场信息</summary>
  ...
</details>
```

**Step 3: Add minimal styles for expandable section**

**Step 4: Run test to verify pass**

Run: `node tests/devices.entry-detail.test.js`
Expected: PASS

### Task 4: 回归验证

**Files:**
- Test: `tests/devices.entry-detail.test.js`
- Test: `tests/*.test.js`

**Step 1: Run targeted tests**

Run: `node tests/devices.entry-detail.test.js`
Expected: PASS

**Step 2: Run all regression tests**

Run: `for f in tests/*.test.js; do node "$f"; done`
Expected: 全部 PASS

**Step 3: Verify key bindings still present**

Run: `rg -n "deviceSearchInput|locationSelect|locationAddressInput|viewDetail\(" device-entry.html devices.html`
Expected: 关键 ID 与详情入口不丢失
