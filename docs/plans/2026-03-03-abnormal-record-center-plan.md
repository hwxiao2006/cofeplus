# Abnormal Record Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `/Users/tigerhuang/cofeplus/faults.html` 新增“异常记录”全局视图，让运维可在一个入口查看全部异常并支持基础筛选。

**Architecture:** 继续沿用单文件页面（HTML + inline CSS/JS）架构，在现有 Tab 体系中新增 `abnormal` 视图分支。通过 `currentTab` 分流“设备卡片渲染”和“异常记录渲染”，并复用 `tests/faults.behavior.test.js` 的脚本注入测试方式做 TDD 增量验证。

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js assert/vm test harness

---

**Execution skills:** `@superpowers/test-driven-development`、`@superpowers/verification-before-completion`

### Task 1: Add abnormal tab and summary mode switch

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/faults.html`

**Step 1: Write the failing test**

在 `tests/faults.behavior.test.js` 新增测试，断言 Tab 中存在“异常记录”，并在切换 `currentTab = 'abnormal'` 后摘要文案从“台设备”切换为“条异常”：

```js
test('故障列表：应提供异常记录Tab并切换统计口径', () => {
  const ctx = loadFaultContext();
  ctx.renderTabs();
  const tabsHtml = ctx.document.getElementById('tabs').innerHTML;
  assert.ok(tabsHtml.includes('异常记录'));

  ctx.currentTab = 'abnormal';
  ctx.renderSummary();
  const summary = ctx.document.getElementById('summary').textContent;
  assert.ok(summary.includes('条异常'));
});
```

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: FAIL（找不到“异常记录”或摘要仍为“台设备”）

**Step 3: Write minimal implementation**

在 `faults.html` 中：
- `tabConfig` 新增 `{ key: 'abnormal', label: '异常记录' }`
- 新增 `getSummaryText()`，根据 `currentTab` 返回：
  - 设备视图：`总计 X 台设备`
  - 异常视图：`总计 X 条异常（未恢复 Y 条）`
- `renderSummary()` 改为调用 `getSummaryText()`

```js
function renderSummary() {
  document.getElementById('summary').textContent = getSummaryText();
}
```

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: 新增用例 PASS，且无新增 FAIL

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/faults.html /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js
git commit -m "feat: add abnormal tab and summary mode switch"
```

### Task 2: Render global abnormal list in abnormal tab

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/faults.html`

**Step 1: Write the failing test**

新增测试，断言 `currentTab = 'abnormal'` 时渲染异常记录容器而非设备卡片：

```js
test('异常记录Tab：应渲染全量异常列表而非设备卡片', () => {
  const ctx = loadFaultContext();
  ctx.currentTab = 'abnormal';
  ctx.renderList();

  const html = ctx.document.getElementById('list').innerHTML;
  assert.ok(html.includes('abnormal-record-list'));
  assert.ok(html.includes('abnormal-record-item'));
  assert.ok(!html.includes('fault-card'));
});
```

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: FAIL（尚无 `abnormal-record-list`）

**Step 3: Write minimal implementation**

在 `faults.html` 中：
- 新增 `abnormalRecords` mock 数据（含 `recordId/deviceId/siteName/type/code/message/status/startedAt/recoveredAt`）
- 新增 `getFilteredAbnormalRecords()` 与 `renderAbnormalRecordList(records)`
- 在 `renderList()` 中分流：

```js
function renderList() {
  const container = document.getElementById('list');
  if (currentTab === 'abnormal') {
    const records = getFilteredAbnormalRecords();
    container.innerHTML = renderAbnormalRecordList(records);
    return;
  }
  // existing device card rendering...
}
```

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: 新增异常列表用例 PASS

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/faults.html /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js
git commit -m "feat: render abnormal records list in faults page"
```

### Task 3: Add abnormal view filters (status + keyword)

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/faults.html`

**Step 1: Write the failing test**

新增测试，验证“仅看未恢复”与关键词过滤：

```js
test('异常记录Tab：应支持未恢复与关键词筛选', () => {
  const ctx = loadFaultContext();
  ctx.currentTab = 'abnormal';
  ctx.searchKeyword = 'RCK019';
  ctx.abnormalStatusFilter = 'open';

  const records = ctx.getFilteredAbnormalRecords();
  assert.ok(records.length > 0);
  assert.ok(records.every(item => item.status === 'open'));
  assert.ok(records.every(item => item.deviceId.includes('RCK019') || item.siteName.includes('RCK019')));
});
```

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: FAIL（`abnormalStatusFilter` 或筛选逻辑不存在）

**Step 3: Write minimal implementation**

在 `faults.html` 中：
- 新增 `let abnormalStatusFilter = 'all';`
- 更新 `handleSearch()`：在 `abnormal` 视图下触发异常记录重渲染
- `getFilteredAbnormalRecords()` 支持 `searchKeyword + abnormalStatusFilter`
- 在异常视图顶部新增状态筛选控件（全部/未恢复/已恢复）

```js
function getFilteredAbnormalRecords() {
  const keyword = searchKeyword.trim().toLowerCase();
  return abnormalRecords.filter(item => {
    const byStatus = abnormalStatusFilter === 'all' || item.status === abnormalStatusFilter;
    const byKeyword = !keyword
      || item.deviceId.toLowerCase().includes(keyword)
      || item.siteName.toLowerCase().includes(keyword)
      || item.message.toLowerCase().includes(keyword);
    return byStatus && byKeyword;
  });
}
```

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: 新增筛选测试 PASS

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/faults.html /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js
git commit -m "feat: support abnormal record filters"
```

### Task 4: Keep device-level abnormal record entry consistent

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`
- Modify: `/Users/tigerhuang/cofeplus/faults.html`

**Step 1: Write the failing test**

新增测试，验证从设备详情进入时仅显示该设备异常：

```js
test('状态记录入口：设备级异常记录应只显示当前设备', () => {
  const ctx = loadFaultContext();
  ctx.openStatusRecords('RCK019');
  ctx.openAbnormalRecords();

  const html = ctx.document.getElementById('abnormalRecordPage').innerHTML;
  assert.ok(html.includes('RCK019-异常记录'));
  assert.ok(!html.includes('RCK073-异常记录'));
});
```

**Step 2: Run test to verify it fails**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: FAIL（若异常数据改造后丢失设备维度过滤）

**Step 3: Write minimal implementation**

在 `faults.html` 中：
- `openAbnormalRecords()` 改为优先按 `activeFaultDeviceId` 过滤 `abnormalRecords`
- 保持现有标题格式 `${deviceId}-异常记录`
- 保留返回链路：关闭后回到 `openStatusRecords(activeFaultDeviceId)`

```js
const records = getFilteredAbnormalRecords().filter(item => item.deviceId === deviceId);
```

**Step 4: Run test to verify it passes**

Run: `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`  
Expected: 设备级异常入口相关用例 PASS，既有状态记录用例继续 PASS

**Step 5: Commit**

```bash
git add /Users/tigerhuang/cofeplus/faults.html /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js
git commit -m "fix: preserve device-scoped abnormal record flow"
```

### Task 5: Final verification and documentation touch-up

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/docs/plans/2026-03-03-abnormal-record-center-design.md` (如实现细节有偏差再更新)

**Step 1: Run full regression for touched scope**

Run:
- `node /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`
- `node /Users/tigerhuang/cofeplus/tests/materials.device-routing.test.js`

Expected: 全部 PASS（无 FAIL 输出，`process.exitCode` 为 0）

**Step 2: Manual sanity check**

Run: `open /Users/tigerhuang/cofeplus/faults.html`  
Expected:
- 能切换到“异常记录”Tab
- 能按关键词和状态筛选
- 设备卡片内“状态记录 -> 异常记录”仍可用

**Step 3: Commit final polish**

```bash
git add /Users/tigerhuang/cofeplus/faults.html /Users/tigerhuang/cofeplus/tests/faults.behavior.test.js /Users/tigerhuang/cofeplus/docs/plans/2026-03-03-abnormal-record-center-design.md
git commit -m "chore: finalize abnormal record center rollout"
```
