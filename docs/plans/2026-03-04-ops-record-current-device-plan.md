# Current Device Ops Record Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在故障页“状态记录”中新增当前设备“运维记录”可视化页面，替换“开发中”占位提示。

**Architecture:** 延续 `faults.html` 单文件结构，在现有 overlay 机制下新增一个 `operationRecordPage` 层和对应打开/关闭函数。数据先使用 `getOperationRecords(deviceId)` mock，交互与 `openAbnormalRecords` 保持一致，确保桌面与移动端行为统一。

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js assert/vm tests

---

**Execution skills:** `@superpowers/test-driven-development`、`@superpowers/verification-before-completion`

### Task 1: Add failing tests for operation records entry

**Files:**
- Modify: `/Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js`

**Step 1: Write the failing test**

新增测试：点击“运维记录”应渲染当前设备标题与记录字段。

```js
test('状态记录：点击运维记录后应显示当前设备运维记录', () => {
  const ctx = loadFaultContext();
  ctx.openStatusRecords('RCK019');
  ctx.openOperationRecords();

  const page = ctx.document.getElementById('operationRecordPage');
  assert.strictEqual(page.classList.contains('active'), true);
  assert.ok(page.innerHTML.includes('RCK019-运维记录'));
  assert.ok(page.innerHTML.includes('操作人'));
  assert.ok(page.innerHTML.includes('操作项'));
  assert.ok(page.innerHTML.includes('处理结果'));
});
```

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js`  
Expected: FAIL（`openOperationRecords` 不存在或 `operationRecordPage` 未渲染）

**Step 3: Commit test-only change**

```bash
git add /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js
git commit -m "test: cover operation records entry in status page"
```

### Task 2: Implement operation records page and data

**Files:**
- Modify: `/Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/faults.html`
- Modify: `/Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js`

**Step 1: Write minimal implementation**

在 `faults.html` 中补齐：
- DOM：新增 `<div id="operationRecordPage" class="status-page-overlay"></div>`
- 数据：`getOperationRecords(deviceId)` 返回当前设备 mock 记录
- 交互：
  - `openOperationRecords()`：隐藏状态页、打开运维记录页
  - `closeOperationRecords()`：关闭运维记录页并回到状态页
- 入口：把“运维记录”按钮 `onclick` 从 `alert(...)` 改为 `openOperationRecords()`
- 样式：复用 `abnormal-list`/`abnormal-card`，确保桌面与移动端一致

示意代码：

```js
function openOperationRecords() {
  const page = document.getElementById('operationRecordPage');
  const deviceId = activeFaultDeviceId || '-';
  const records = getOperationRecords(deviceId);
  // build overlay content ...
  page.classList.add('active');
}
```

**Step 2: Run tests to verify green**

Run: `node /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js`  
Expected: 新增“运维记录”测试 PASS，旧测试继续 PASS

**Step 3: Commit implementation**

```bash
git add /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/faults.html /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js
git commit -m "feat: add current device operation records page"
```

### Task 3: Regression verification and polish

**Files:**
- Modify: `/Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/docs/plans/2026-03-04-ops-record-current-device-design.md`（仅当实现细节与设计不一致时）

**Step 1: Run scoped regression**

Run:
- `node /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js`
- `node /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/materials.device-routing.test.js`

Expected: 全部 PASS

**Step 2: Optional manual check**

Run: `open /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/faults.html`  
Expected: 点击“状态记录 -> 运维记录”可看到当前设备运维记录。

**Step 3: Commit final polish**

```bash
git add /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/faults.html /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/tests/faults.behavior.test.js /Users/tigerhuang/.config/superpowers/worktrees/cofeplus/ops-record-current-device/docs/plans/2026-03-04-ops-record-current-device-design.md
git commit -m "chore: finalize current device operation records"
```
