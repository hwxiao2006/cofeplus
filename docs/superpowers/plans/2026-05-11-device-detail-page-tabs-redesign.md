# 设备详情页 Tabs 重构 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把设备详情页从"主列瀑布 + 右侧操作栏"改为"置顶头 + 5-tab 视图",信息按场景分组,运营数据剥离出详情页。

**Architecture:** 单文件改动(`devices.html`)。采用**加-换-删三段式**:先添加新结构(不破坏旧),再切换渲染入口,最后清理旧结构。重启 split button(Task 1 已 commit)从侧栏迁移到头部。

**Tech Stack:** HTML/CSS/JS(vanilla)· Node.js 内建 test runner(`node --test`)· 项目自定义 `test()` helper + regex/VM 测试模式。

**Spec:** `docs/superpowers/specs/2026-05-11-device-detail-page-tabs-redesign.md`

**基线:** `feat/restart-split-button` @ 1992dbb(Task 1: split button CSS 已 commit)。4 个已知失败测试(login/font-stack/device-search)与本改动无关,执行中保持同样数量。

---

## 文件结构

| 文件 | 动作 |
|---|---|
| `devices.html` | 修改(全部改动) |
| `tests/devices.detail-tabs.test.js` | 新建(静态结构测试) |
| `tests/devices.detail-tabs.runtime.test.js` | 新建(切换行为测试) |
| `tests/devices.detail-tab-overview.test.js` | 新建 |
| `tests/devices.detail-tab-run.test.js` | 新建 |
| `tests/devices.detail-tab-records.test.js` | 新建 |
| `tests/devices.detail-tab-entry.test.js` | 新建 |
| `tests/devices.detail-tab-adscreen.test.js` | 新建 |
| `tests/devices.restart-split-button.test.js` | 修改(断言 split button 在头部) |

---

## Task 1: 添加置顶头 CSS + DOM 骨架(无行为)

**Files:**
- Modify: `devices.html`(CSS 块中,现有 `.detail-side-restart-*` 之后;以及详情页渲染模板)

- [ ] **Step 1: 写失败测试**

创建 `tests/devices.detail-tabs.test.js`:

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('置顶头容器 CSS 应存在', () => {
  assert.ok(/\.detail-top-head\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-top-head\s*\{[\s\S]*padding:\s*14px 18px/.test(html));
  assert.ok(/\.detail-top-head\s*\{[\s\S]*display:\s*flex/.test(html));
});

test('置顶头元素(back/id/pill/loc/actions)CSS 应齐备', () => {
  assert.ok(/\.detail-top-back\s*\{/.test(html));
  assert.ok(/\.detail-top-id\s*\{[\s\S]*font-size:\s*18px/.test(html));
  assert.ok(/\.detail-top-pill\s*\{[\s\S]*border-radius:\s*999px/.test(html));
  assert.ok(/\.detail-top-loc\s*\{[\s\S]*color:\s*#6b7280/.test(html));
  assert.ok(/\.detail-top-actions\s*\{[\s\S]*gap:\s*6px/.test(html));
});

test('置顶头操作区"远程操作"按钮应有蓝色渐变', () => {
  assert.ok(/\.detail-top-action-btn\.blue\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#1d4ed8\)/.test(html));
});
```

- [ ] **Step 2: 跑测试确认 FAIL**

```bash
node --test tests/devices.detail-tabs.test.js
```

预期: 3 条 FAIL。

- [ ] **Step 3: 插入置顶头 CSS**

在 `devices.html` 的 `<style>` 中,`.detail-side-restart-popover-hint` 规则之后插入:

```css
        /* ============ 新详情页:置顶头 ============ */
        .detail-top-head {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px 12px 0 0;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 0;
        }
        .detail-top-back {
            color: #6b7280;
            font-size: 18px;
            cursor: pointer;
            background: transparent;
            border: 0;
            padding: 0 6px;
            line-height: 1;
        }
        .detail-top-back:hover { color: #0f766e; }
        .detail-top-id {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
        }
        .detail-top-pill {
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            background: #dcfce7;
            color: #166534;
        }
        .detail-top-pill.entered {
            background: #dbeafe;
            color: #1e40af;
        }
        .detail-top-pill.stopped {
            background: #fef3c7;
            color: #92400e;
        }
        .detail-top-pill.faulted {
            background: #fee2e2;
            color: #991b1b;
        }
        .detail-top-loc {
            color: #6b7280;
            font-size: 12px;
            flex: 1;
        }
        .detail-top-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .detail-top-action-btn {
            padding: 7px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: #fff;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            color: #1f2937;
        }
        .detail-top-action-btn:hover {
            border-color: #0f766e;
            color: #0f766e;
        }
        .detail-top-action-btn.blue {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #fff;
            border-color: #1d4ed8;
            font-weight: 600;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.18);
        }
        .detail-top-action-btn.blue:hover {
            background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
            color: #fff;
        }
```

- [ ] **Step 4: 跑测试确认 PASS**

```bash
node --test tests/devices.detail-tabs.test.js
```

预期: 3 PASS。

- [ ] **Step 5: 全量测试无回归**

```bash
node --test tests/ 2>&1 | tail -5
```

预期: 与基线一致(4 个已知失败,其余全 PASS)。

- [ ] **Step 6: Commit**

```bash
git add devices.html tests/devices.detail-tabs.test.js docs/superpowers/specs/2026-05-11-device-detail-page-tabs-redesign.md
git commit -m "feat(devices): add detail-top-head CSS (tabs redesign foundation)"
```

---

## Task 2: 添加 Tabs 栏 CSS + 切换基础设施

**Files:**
- Modify: `devices.html`(CSS + 新增 `switchDetailTab` JS)

- [ ] **Step 1: 追加失败测试到 `tests/devices.detail-tabs.test.js`**

```javascript
test('tabs 栏 CSS 应存在', () => {
  assert.ok(/\.detail-tabs\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-tab\s*\{[\s\S]*cursor:\s*pointer/.test(html));
  assert.ok(/\.detail-tab\.active\s*\{[\s\S]*color:\s*#0f766e/.test(html));
  assert.ok(/\.detail-tab\.active\s*\{[\s\S]*border-bottom-color:\s*#0f766e/.test(html));
});

test('tab body 容器 CSS 应存在', () => {
  assert.ok(/\.detail-tab-body\s*\{[\s\S]*background:\s*#fff/.test(html));
  assert.ok(/\.detail-tab-body\s*\{[\s\S]*border-radius:\s*0 0 12px 12px/.test(html));
});

test('switchDetailTab 函数应定义', () => {
  assert.ok(/function\s+switchDetailTab\s*\(/.test(html));
});
```

- [ ] **Step 2: 跑测试确认 FAIL**

```bash
node --test tests/devices.detail-tabs.test.js
```

预期: 3 条新 FAIL。

- [ ] **Step 3: 插入 tabs CSS**

在 `.detail-top-action-btn.blue:hover` 之后插入:

```css
        /* Tabs 栏 */
        .detail-tabs {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-top: 0;
            display: flex;
            padding: 0 18px;
            gap: 4px;
            overflow-x: auto;
        }
        .detail-tabs::-webkit-scrollbar { display: none; }
        .detail-tab {
            padding: 10px 18px;
            font-size: 13px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: color 0.15s, border-color 0.15s;
            background: transparent;
            border-left: 0;
            border-right: 0;
            border-top: 0;
            white-space: nowrap;
            font-family: inherit;
        }
        .detail-tab:hover { color: #0f766e; }
        .detail-tab.active {
            color: #0f766e;
            border-bottom-color: #0f766e;
            font-weight: 700;
        }

        /* Tab body */
        .detail-tab-body {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-top: 0;
            border-radius: 0 0 12px 12px;
            padding: 20px;
            min-height: 300px;
        }
        .detail-tab-pane { display: none; }
        .detail-tab-pane.active { display: block; }
```

- [ ] **Step 4: 在 `<script>` 中新增切换函数**

紧跟 `closeDetailRestartPopover` 之后插入:

```javascript
        // 详情页 tabs 切换
        function switchDetailTab(tabKey) {
            const validKeys = ['overview', 'run', 'records', 'entry', 'adscreen'];
            if (!validKeys.includes(tabKey)) tabKey = 'overview';

            document.querySelectorAll('.detail-tab').forEach(el => {
                el.classList.toggle('active', el.getAttribute('data-tab') === tabKey);
                el.setAttribute('aria-selected', el.getAttribute('data-tab') === tabKey ? 'true' : 'false');
            });
            document.querySelectorAll('.detail-tab-pane').forEach(el => {
                el.classList.toggle('active', el.getAttribute('data-tab-pane') === tabKey);
            });

            // 同步 URL hash(不影响历史)
            if (typeof history !== 'undefined' && history.replaceState) {
                history.replaceState(null, '', '#tab=' + tabKey);
            }
        }

        function readDetailTabFromHash() {
            const m = /tab=([a-z]+)/.exec(window.location.hash || '');
            return m ? m[1] : 'overview';
        }
```

- [ ] **Step 5: 跑测试确认 PASS**

```bash
node --test tests/devices.detail-tabs.test.js
```

预期: 全部 PASS。

- [ ] **Step 6: 写 switchDetailTab 运行时测试**

新建 `tests/devices.detail-tabs.runtime.test.js`:

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

function extractFn(html, name) {
  const sig = `function ${name}(`;
  const start = html.indexOf(sig);
  if (start === -1) throw new Error(`未找到 ${name}`);
  const b = html.indexOf('{', start);
  let d = 0;
  for (let i = b; i < html.length; i += 1) {
    if (html[i] === '{') d += 1;
    if (html[i] === '}') d -= 1;
    if (d === 0) return html.slice(start, i + 1);
  }
  throw new Error(`解析失败 ${name}`);
}

function buildSandbox() {
  const tabs = { overview: { cls: [], attr: {} }, run: { cls: [], attr: {} } };
  const panes = { overview: { cls: [] }, run: { cls: [] } };
  function mkEl(cls, attr) {
    return {
      classList: {
        toggle(name, on) {
          if (on) { if (!cls.includes(name)) cls.push(name); }
          else { const i = cls.indexOf(name); if (i >= 0) cls.splice(i, 1); }
        },
        contains(name) { return cls.includes(name); }
      },
      setAttribute(n, v) { attr[n] = v; },
      getAttribute(n) { return attr[n] ?? null; }
    };
  }
  const tabEls = [
    Object.assign(mkEl(tabs.overview.cls, tabs.overview.attr), { getAttribute: n => n === 'data-tab' ? 'overview' : tabs.overview.attr[n] }),
    Object.assign(mkEl(tabs.run.cls, tabs.run.attr), { getAttribute: n => n === 'data-tab' ? 'run' : tabs.run.attr[n] })
  ];
  const paneEls = [
    Object.assign(mkEl(panes.overview.cls, {}), { getAttribute: () => 'overview' }),
    Object.assign(mkEl(panes.run.cls, {}), { getAttribute: () => 'run' })
  ];
  const sandbox = {
    console,
    document: {
      querySelectorAll(sel) {
        if (sel === '.detail-tab') return tabEls;
        if (sel === '.detail-tab-pane') return paneEls;
        return [];
      }
    },
    history: { replaceState() {} },
    window: { location: { hash: '' } }
  };
  vm.createContext(sandbox);
  return { sandbox, tabs, panes };
}

test('switchDetailTab("run") 应激活 run tab 和 pane', () => {
  const { sandbox, tabs, panes } = buildSandbox();
  vm.runInContext(extractFn(html, 'switchDetailTab'), sandbox);
  sandbox.switchDetailTab('run');
  assert.ok(tabs.run.cls.includes('active'), 'run tab 应 active');
  assert.ok(!tabs.overview.cls.includes('active'), 'overview tab 不应 active');
  assert.ok(panes.run.cls.includes('active'));
});

test('switchDetailTab(非法) 应回退到 overview', () => {
  const { sandbox, tabs } = buildSandbox();
  vm.runInContext(extractFn(html, 'switchDetailTab'), sandbox);
  sandbox.switchDetailTab('bogus');
  assert.ok(tabs.overview.cls.includes('active'));
});
```

- [ ] **Step 7: 跑运行时测试**

```bash
node --test tests/devices.detail-tabs.runtime.test.js
```

预期: 2 PASS。

- [ ] **Step 8: 全量测试无回归**

```bash
node --test tests/ 2>&1 | tail -5
```

预期: 与基线一致。

- [ ] **Step 9: Commit**

```bash
git add devices.html tests/devices.detail-tabs.test.js tests/devices.detail-tabs.runtime.test.js
git commit -m "feat(devices): add detail tabs CSS + switchDetailTab infrastructure"
```

---

## Task 3: 写详情页新渲染入口(不接线,留 dead code)

**Files:**
- Modify: `devices.html`(新增 `renderDetailTabsShell(summary, fault, entryData, counts)` 函数)

- [ ] **Step 1: 追加失败测试**

```javascript
// tests/devices.detail-tabs.test.js 末尾
test('renderDetailTabsShell 函数应存在', () => {
  assert.ok(/function\s+renderDetailTabsShell\s*\(/.test(html));
});

test('renderDetailTabsShell 渲染结果应包含 5 个 tab 按钮', () => {
  const fnStart = html.indexOf('function renderDetailTabsShell(');
  const fnChunk = html.slice(fnStart, fnStart + 4000);
  assert.ok(/data-tab="overview"/.test(fnChunk));
  assert.ok(/data-tab="run"/.test(fnChunk));
  assert.ok(/data-tab="records"/.test(fnChunk));
  assert.ok(/data-tab="entry"/.test(fnChunk));
  assert.ok(/data-tab="adscreen"/.test(fnChunk));
});
```

- [ ] **Step 2: 跑测试 FAIL**

```bash
node --test tests/devices.detail-tabs.test.js
```

- [ ] **Step 3: 在 `<script>` 中插入 `renderDetailTabsShell`**

放在 `renderDetailCard` 附近(约 6246 行之后)。代码:

```javascript
        function renderDetailTabsShell(summary, fault, entryData, counts) {
            const deviceId = escapeHtml(summary?.deviceId || '-');
            const statusName = escapeHtml(summary?.statusName || '-');
            const statusClass = summary?.status === 'stopped' ? 'stopped'
                : summary?.status === 'faulted' ? 'faulted' : '';
            const locationName = escapeHtml(summary?.locationName || '未分配点位');
            const entered = summary?.entered !== false;

            const head = `
                <div class="detail-top-head">
                    <button type="button" class="detail-top-back" onclick="closeDetailModal()">‹</button>
                    <div class="detail-top-id">${deviceId}</div>
                    <span class="detail-top-pill ${statusClass}">● ${statusName}</span>
                    <span class="detail-top-pill entered">${entered ? '已入场' : '未入场'}</span>
                    <div class="detail-top-loc">${locationName}</div>
                    <div class="detail-top-actions">
                        <div class="detail-side-restart-split" style="position:relative">
                            <button type="button" class="detail-side-restart-primary" onclick="openDetailRestartSystem('${deviceId}')" aria-label="重启设备">
                                <span class="detail-side-restart-icon" aria-hidden="true"></span>
                                <span>重启</span>
                            </button>
                            <button type="button" class="detail-side-restart-caret" onclick="toggleDetailRestartPopover(event, '${deviceId}')" aria-haspopup="menu" aria-expanded="false" aria-label="选择重启部件">
                                <span class="detail-side-restart-chevron" aria-hidden="true"></span>
                            </button>
                            <div class="detail-side-restart-popover" role="menu" data-open="false">
                                <button type="button" class="detail-side-restart-popover-item" role="menuitem" onclick="openDetailRestartPart('${deviceId}', '重启点单屏（左）')"><span class="detail-side-restart-popover-dot"></span><span>点单屏(左)</span></button>
                                <button type="button" class="detail-side-restart-popover-item" role="menuitem" onclick="openDetailRestartPart('${deviceId}', '重启点单屏（右）')"><span class="detail-side-restart-popover-dot"></span><span>点单屏(右)</span></button>
                                <button type="button" class="detail-side-restart-popover-item" role="menuitem" onclick="openDetailRestartPart('${deviceId}', '重启六轴机械臂（注意安全，谨慎使用）')"><span class="detail-side-restart-popover-dot detail-side-restart-popover-dot--danger"></span><span>六轴机械臂</span><span class="detail-side-restart-popover-hint">谨慎</span></button>
                            </div>
                        </div>
                        <button type="button" class="detail-top-action-btn blue" onclick="openDetailRemoteActions('${deviceId}')">远程操作</button>
                        <button type="button" class="detail-top-action-btn" onclick="openDetailMoreMenu(event, '${deviceId}')">⋯ 更多</button>
                    </div>
                </div>
            `;

            const tabs = `
                <div class="detail-tabs" role="tablist">
                    <button type="button" class="detail-tab" role="tab" data-tab="overview" onclick="switchDetailTab('overview')">概览</button>
                    <button type="button" class="detail-tab" role="tab" data-tab="run" onclick="switchDetailTab('run')">运行</button>
                    <button type="button" class="detail-tab" role="tab" data-tab="records" onclick="switchDetailTab('records')">记录</button>
                    <button type="button" class="detail-tab" role="tab" data-tab="entry" onclick="switchDetailTab('entry')">入场</button>
                    <button type="button" class="detail-tab" role="tab" data-tab="adscreen" onclick="switchDetailTab('adscreen')">广告屏</button>
                </div>
            `;

            const body = `
                <div class="detail-tab-body">
                    <div class="detail-tab-pane" data-tab-pane="overview">${renderDetailTabOverview(summary, fault)}</div>
                    <div class="detail-tab-pane" data-tab-pane="run">${renderDetailTabRun(fault, entryData)}</div>
                    <div class="detail-tab-pane" data-tab-pane="records">${renderDetailTabRecords(summary)}</div>
                    <div class="detail-tab-pane" data-tab-pane="entry">${renderDetailTabEntry(entryData)}</div>
                    <div class="detail-tab-pane" data-tab-pane="adscreen">${renderDetailTabAdScreen(entryData, fault)}</div>
                </div>
            `;

            return head + tabs + body;
        }

        // 占位,Task 4-8 分别实现
        function renderDetailTabOverview(summary, fault) { return '<!-- overview placeholder -->'; }
        function renderDetailTabRun(fault, entryData) { return '<!-- run placeholder -->'; }
        function renderDetailTabRecords(summary) { return '<!-- records placeholder -->'; }
        function renderDetailTabEntry(entryData) { return '<!-- entry placeholder -->'; }
        function renderDetailTabAdScreen(entryData, fault) { return '<!-- adscreen placeholder -->'; }

        // 更多菜单占位(Task 9 实现)
        function openDetailMoreMenu(event, deviceId) {
            if (event) event.stopPropagation();
            console.log('TODO: open more menu for', deviceId);
        }
```

- [ ] **Step 4: 跑测试 PASS**

```bash
node --test tests/devices.detail-tabs.test.js tests/devices.detail-tabs.runtime.test.js
```

预期: 全部 PASS。

- [ ] **Step 5: 全量测试**

```bash
node --test tests/ 2>&1 | tail -5
```

预期: 无回归(4 known fail 不变)。

- [ ] **Step 6: Commit**

```bash
git add devices.html tests/devices.detail-tabs.test.js
git commit -m "feat(devices): add renderDetailTabsShell scaffolding with placeholders"
```

---

## Task 4: 实现 [概览] tab 内容

**Files:**
- Modify: `devices.html`(`renderDetailTabOverview` 实现)
- Create: `tests/devices.detail-tab-overview.test.js`

- [ ] **Step 1: 写测试**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabOverview 应渲染基本信息和当前状态两栏', () => {
  const fnStart = html.indexOf('function renderDetailTabOverview(');
  const nextFn = html.indexOf('function renderDetailTabRun(');
  const fnBody = html.slice(fnStart, nextFn);
  assert.ok(/renderDeviceOverviewCard/.test(fnBody), '应调用 renderDeviceOverviewCard');
  assert.ok(/renderDeviceStatusCard/.test(fnBody), '应调用 renderDeviceStatusCard');
  assert.ok(/detail-tab-grid-2|display:\s*grid[\s\S]*grid-template-columns:\s*1fr 1fr/.test(fnBody) ||
    /class="detail-tab-grid"/.test(fnBody),
    '应为双栏布局');
});
```

- [ ] **Step 2: 跑测试 FAIL**

```bash
node --test tests/devices.detail-tab-overview.test.js
```

- [ ] **Step 3: 添加双栏布局 CSS**

在 tab body CSS 之后追加:

```css
        .detail-tab-grid { display: grid; gap: 14px; }
        .detail-tab-grid.cols-2 { grid-template-columns: 1fr 1fr; }
        .detail-tab-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .detail-tab-grid > .span-all { grid-column: 1 / -1; }
        @media (max-width: 768px) {
            .detail-tab-grid.cols-2,
            .detail-tab-grid.cols-3 { grid-template-columns: 1fr; }
        }
```

- [ ] **Step 4: 实现 `renderDetailTabOverview`**

替换 Task 3 里的占位版本:

```javascript
        function renderDetailTabOverview(summary, fault) {
            return `
                <div class="detail-tab-grid cols-2">
                    ${renderDeviceOverviewCard(summary)}
                    ${renderDeviceStatusCard(summary, fault)}
                </div>
            `;
        }
```

> 注:main 上函数叫 `renderDeviceOverviewCard`(spec 草稿里误写为 `renderDeviceBasicCard`,以此为准)。

- [ ] **Step 5: 跑测试 PASS**

```bash
node --test tests/devices.detail-tab-overview.test.js
```

- [ ] **Step 6: 全量测试**

```bash
node --test tests/ 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add devices.html tests/devices.detail-tab-overview.test.js
git commit -m "feat(devices): implement detail [overview] tab"
```

---

## Task 5: 实现 [运行] tab 内容

**Files:**
- Modify: `devices.html`
- Create: `tests/devices.detail-tab-run.test.js`

- [ ] **Step 1: 写测试**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabRun 应包含温度瓦片、软件版本、机构状态、温度报警卡', () => {
  const fnStart = html.indexOf('function renderDetailTabRun(');
  const nextFn = html.indexOf('function renderDetailTabRecords(');
  const fnBody = html.slice(fnStart, nextFn);
  assert.ok(/fridgeTemp/.test(fnBody), '应渲染 fridgeTemp');
  assert.ok(/beanTemp/.test(fnBody), '应渲染 beanTemp');
  assert.ok(/craftTemp/.test(fnBody), '应渲染 craftTemp');
  assert.ok(/beanHumidity/.test(fnBody), '应渲染 beanHumidity');
  assert.ok(/upperSoftware/.test(fnBody), '应渲染 upperSoftware');
  assert.ok(/firmwareVersion/.test(fnBody), '应渲染 firmwareVersion');
  assert.ok(/orgStatus/.test(fnBody), '应渲染 orgStatus chips');
  assert.ok(/buildDetailTemperatureAlarmZones/.test(fnBody), '应调用温度报警数据源');
  assert.ok(/paymentMethods/.test(fnBody), '应渲染 paymentMethods');
  assert.ok(/energyMode/.test(fnBody), '应渲染 energyMode');
  assert.ok(/networkSignal/.test(fnBody), '应渲染 networkSignal');
});

test('温度瓦片 CSS 应存在', () => {
  assert.ok(/\.detail-temp-tile\s*\{/.test(html));
  assert.ok(/\.detail-temp-tile-val\s*\{[\s\S]*font-size:\s*20px/.test(html));
});
```

- [ ] **Step 2: 跑测试 FAIL**

```bash
node --test tests/devices.detail-tab-run.test.js
```

- [ ] **Step 3: 添加温度瓦片 CSS**

追加在 `.detail-tab-grid` 之后:

```css
        .detail-temp-tile {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
        }
        .detail-temp-tile-lbl {
            font-size: 10.5px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .detail-temp-tile-val {
            font-size: 20px;
            font-weight: 700;
            color: #134e4a;
            margin: 4px 0 2px;
        }
        .detail-temp-tile-sub {
            font-size: 10.5px;
            color: #9ca3af;
            font-weight: 500;
        }
        .detail-temp-tile-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
        }
        @media (max-width: 768px) {
            .detail-temp-tile-row { grid-template-columns: repeat(2, 1fr); }
        }
```

- [ ] **Step 4: 实现 `renderDetailTabRun`**

```javascript
        function renderDetailTabRun(fault, entryData) {
            const snap = fault || {};
            const info = entryData?.info || {};

            const tempTiles = `
                <div class="detail-temp-tile-row">
                    <div class="detail-temp-tile">
                        <div class="detail-temp-tile-lbl">冰箱温度</div>
                        <div class="detail-temp-tile-val">${escapeHtml(snap.fridgeTemp || '-')}</div>
                        <div class="detail-temp-tile-sub">fridgeTemp</div>
                    </div>
                    <div class="detail-temp-tile">
                        <div class="detail-temp-tile-lbl">豆仓温度</div>
                        <div class="detail-temp-tile-val">${escapeHtml(snap.beanTemp || '-')}</div>
                        <div class="detail-temp-tile-sub">beanTemp</div>
                    </div>
                    <div class="detail-temp-tile">
                        <div class="detail-temp-tile-lbl">制作仓温度</div>
                        <div class="detail-temp-tile-val">${escapeHtml(snap.craftTemp || '-')}</div>
                        <div class="detail-temp-tile-sub">craftTemp</div>
                    </div>
                    <div class="detail-temp-tile">
                        <div class="detail-temp-tile-lbl">豆仓湿度</div>
                        <div class="detail-temp-tile-val">${escapeHtml(snap.beanHumidity || '-')}</div>
                        <div class="detail-temp-tile-sub">beanHumidity</div>
                    </div>
                </div>
            `;

            const softwareRows = [
                ['上位机软件', snap.upperSoftware],
                ['点单屏软件', snap.orderSoftware],
                ['点单屏系统', snap.orderSystem],
                ['点单屏内核', snap.orderKernel],
                ['广告屏版本', snap.adVersion],
                ['固件版本', snap.firmwareVersion],
                ['更新时间', snap.updatedAt]
            ].map(([l, v]) => renderDetailRow(l, v || '-')).join('');
            const softwareCard = renderDetailCard('软件 / 固件版本', softwareRows);

            const opRows = [
                renderDetailRow('支付方式', entryData?.paymentMethods || resolvePaymentMethods(info)),
                renderDetailRow('节能模式', info.energyMode || '-'),
                renderDetailRow('网络信号', info.networkSignal || '-')
            ].join('');
            const opCard = renderDetailCard('运营参数', opRows);

            const orgStatusList = Array.isArray(snap.orgStatus) ? snap.orgStatus : [];
            const chipHtml = orgStatusList.map(part => `
                <span class="detail-fault-chip ${escapeHtml(part.status || 'normal')}">${escapeHtml(`${part.label || ''} ${part.name || ''}`)}</span>
            `).join('');
            const orgCard = renderDetailCard('机构状态',
                `<div class="detail-fault-chip-list">${chipHtml}</div>`);

            const zones = buildDetailTemperatureAlarmZones(summary?.deviceId);
            const zonesHtml = zones.map(z => `
                <div class="detail-temp-zone">
                    <div class="detail-temp-zone-title">${escapeHtml(z.title)}</div>
                    ${renderDetailRow('温度报警', z.tempAlarm || '-')}
                    ${z.humidityAlarm ? renderDetailRow('湿度报警', z.humidityAlarm) : ''}
                    ${z.tempStop ? renderDetailRow('停机温度', z.tempStop) : ''}
                    ${renderDetailRow('存储温度', z.storageTemp || '-')}
                    ${z.normalHumidity ? renderDetailRow('正常湿度', z.normalHumidity) : ''}
                </div>
            `).join('');
            const tempAlarmCard = renderDetailCard(
                '温度报警设置 <a class="detail-card-action" onclick="openDetailTemperatureAlarmModal(\'' + escapeHtml(summary?.deviceId || '') + '\')">编辑</a>',
                `<div class="detail-tab-grid cols-3">${zonesHtml}</div>`);

            return `
                ${tempTiles}
                <div class="detail-tab-grid cols-2">
                    ${softwareCard}
                    ${opCard}
                    <div class="span-all">${orgCard}</div>
                    <div class="span-all">${tempAlarmCard}</div>
                </div>
            `;
        }
```

追加 CSS:

```css
        .detail-temp-zone {
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fff;
        }
        .detail-temp-zone-title {
            font-weight: 600;
            font-size: 12.5px;
            margin-bottom: 6px;
        }
        .detail-card-action {
            font-size: 11px;
            color: #0f766e;
            cursor: pointer;
            font-weight: 500;
        }
```

- [ ] **Step 5: 注意函数闭包访问** — `renderDetailTabRun` 需要访问 `summary.deviceId`,但签名里没传 summary。修正签名为 `renderDetailTabRun(summary, fault, entryData)`,并同步更新 `renderDetailTabsShell` 里的调用:

```javascript
                    <div class="detail-tab-pane" data-tab-pane="run">${renderDetailTabRun(summary, fault, entryData)}</div>
```

- [ ] **Step 6: 跑测试 PASS**

```bash
node --test tests/devices.detail-tab-run.test.js tests/devices.detail-tabs.test.js
```

- [ ] **Step 7: 全量测试**

```bash
node --test tests/ 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
git add devices.html tests/devices.detail-tab-run.test.js
git commit -m "feat(devices): implement detail [run] tab with real fields"
```

---

## Task 6: 实现 [记录] tab 内容

**Files:**
- Modify: `devices.html`
- Create: `tests/devices.detail-tab-records.test.js`

- [ ] **Step 1: 写测试**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('renderDetailTabRecords 应包含状态记录和维护记录', () => {
  const start = html.indexOf('function renderDetailTabRecords(');
  const end = html.indexOf('function renderDetailTabEntry(');
  const body = html.slice(start, end);
  assert.ok(/renderDetailRecordsCard|detail-card-records/.test(body), '应渲染状态记录');
  assert.ok(/renderDetailMaintenanceCard|detail-card-maintenance/.test(body), '应渲染维护记录');
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: 实现**

```javascript
        function renderDetailTabRecords(summary) {
            return `
                <div class="detail-tab-grid cols-2">
                    ${renderDetailRecordsCard(summary)}
                    ${renderDetailMaintenanceCard(summary)}
                </div>
            `;
        }
```

- [ ] **Step 4-6: 跑测试、全量、commit**

```bash
node --test tests/devices.detail-tab-records.test.js tests/
git add devices.html tests/devices.detail-tab-records.test.js
git commit -m "feat(devices): implement detail [records] tab"
```

---

## Task 7: 实现 [入场] tab 内容

**Files:**
- Modify: `devices.html`
- Create: `tests/devices.detail-tab-entry.test.js`

- [ ] **Step 1: 写测试**

```javascript
test('renderDetailTabEntry 应包含合约信息、当前点位、变更历史', () => {
  const start = html.indexOf('function renderDetailTabEntry(');
  const end = html.indexOf('function renderDetailTabAdScreen(');
  const body = html.slice(start, end);
  assert.ok(/renderDetailEntryInfoCard/.test(body), '应调用 renderDetailEntryInfoCard');
  assert.ok(/locationChangeRecords/.test(body), '应渲染变更历史');
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: 实现**

```javascript
        function renderDetailTabEntry(entryData) {
            const info = entryData?.info || {};
            const changes = Array.isArray(info.locationChangeRecords) ? info.locationChangeRecords : [];
            const changeItems = changes.map(r => `
                <div class="detail-change-item">
                    <div class="detail-change-date">${escapeHtml(r.date || '-')}</div>
                    <div class="detail-change-dot"></div>
                    <div>
                        <div class="detail-change-text">${escapeHtml(r.action || '-')}:${escapeHtml(r.locationName || '-')}</div>
                        ${r.note ? `<div class="detail-change-sub">${escapeHtml(r.note)}</div>` : ''}
                    </div>
                </div>
            `).join('');
            const changesCard = changes.length
                ? renderDetailCard(`点位变更历史(${changes.length} 条)`, `<div class="detail-change-list">${changeItems}</div>`)
                : renderDetailCard('点位变更历史', '<div class="detail-empty-hint">暂无变更记录</div>');
            return `
                <div class="detail-tab-grid cols-2">
                    ${renderDetailEntryInfoCard(entryData)}
                    <div class="span-all">${changesCard}</div>
                </div>
            `;
        }
```

追加 CSS:

```css
        .detail-change-list { display: flex; flex-direction: column; gap: 4px; }
        .detail-change-item {
            display: grid;
            grid-template-columns: 80px 8px 1fr;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px dashed #f3f4f6;
        }
        .detail-change-item:last-child { border: 0; }
        .detail-change-date { font-size: 11.5px; color: #6b7280; padding-top: 2px; font-weight: 500; }
        .detail-change-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: #0f766e; margin-top: 6px;
        }
        .detail-change-text { font-size: 12.5px; color: #111827; font-weight: 500; }
        .detail-change-sub { font-size: 10.5px; color: #9ca3af; margin-top: 2px; }
        .detail-empty-hint {
            padding: 14px; text-align: center;
            color: #9ca3af; font-size: 12px;
        }
```

- [ ] **Step 4-6: 跑、测、commit**

```bash
git commit -m "feat(devices): implement detail [entry] tab"
```

---

## Task 8: 实现 [广告屏] tab 内容

**Files:**
- Modify: `devices.html`
- Create: `tests/devices.detail-tab-adscreen.test.js`

- [ ] **Step 1: 写测试**

```javascript
test('renderDetailTabAdScreen 应调用 renderDetailAdScreenCard', () => {
  const start = html.indexOf('function renderDetailTabAdScreen(');
  const endIdx = html.indexOf('function openDetailMoreMenu(') >= 0
    ? html.indexOf('function openDetailMoreMenu(')
    : start + 1500;
  const body = html.slice(start, endIdx);
  assert.ok(/renderDetailAdScreenCard/.test(body), '应调用 renderDetailAdScreenCard');
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: 实现**

第一版 MVP:直接复用 `renderDetailAdScreenCard`,预留位置 for 16:9 preview tiles(后续 task)。

```javascript
        function renderDetailTabAdScreen(entryData, fault) {
            return `
                <div class="detail-tab-grid cols-2">
                    <div class="span-all">${renderDetailAdScreenCard(entryData)}</div>
                </div>
            `;
        }
```

> 16:9 预览瓦片和素材审核卡在本次 plan 内是 TODO,数据结构不存在于 main,后续单开 spec 补。

- [ ] **Step 4-6: 跑、测、commit**

```bash
git commit -m "feat(devices): implement detail [adscreen] tab (MVP, TODO tiles)"
```

---

## Task 9: 切换渲染入口(激活新详情页)

**Files:**
- Modify: `devices.html`(函数 `viewDetail(deviceId)`,约第 9111 行)

**Context:** main 上详情页的 controller 是 `viewDetail(deviceId)`,它往 `#detailModalBody` 写入 HTML。当前主列只渲染 3 张卡(`renderDeviceOverviewCard` / `renderDeviceStatusCard` / `renderDeviceOperationSummaryCard`),其余卡片(入场、广告屏、技术状态、记录)藏在侧栏按钮 `openDetailInfoPanel(...)` 触发的 info panel 里。新 tabs 会把它们直接展示。

- [ ] **Step 1: 写失败测试**

```javascript
// tests/devices.detail-tabs.test.js 末尾
test('viewDetail controller 应调用 renderDetailTabsShell', () => {
  const start = html.indexOf('function viewDetail(');
  assert.ok(start >= 0, '未找到 viewDetail 函数');
  const end = html.indexOf('function closeDetailModal(', start);
  const body = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/renderDetailTabsShell\(/.test(body), 'viewDetail 应调用 renderDetailTabsShell');
  assert.ok(!/<div class="detail-layout">/.test(body), 'viewDetail 不应再输出 .detail-layout');
});

test('viewDetail 切换 tab 后应同步 hash', () => {
  const start = html.indexOf('function viewDetail(');
  const end = html.indexOf('function closeDetailModal(', start);
  const body = html.slice(start, end > 0 ? end : start + 5000);
  assert.ok(/switchDetailTab\(/.test(body), 'viewDetail 应在渲染后调用 switchDetailTab');
});
```

- [ ] **Step 2: FAIL**

```bash
node --test tests/devices.detail-tabs.test.js
```

- [ ] **Step 3: 修改 `viewDetail` 函数**

定位函数(约 9111 行),保留所有数据准备逻辑(`splitDeviceDetailData` / `renderEntryCoreRows` / `getFaultAbnormalRecords` / `getMaintenanceRecordsByDevice` / `detailRecordCounts` 等),**只替换** `document.getElementById('detailModalBody').innerHTML = ...` 赋值的那块模板字符串。

改前(约 9136-9152 行):

```javascript
            document.getElementById('detailModalBody').innerHTML = `
                <div class="detail-layout">
                    <div class="detail-main">
                        <div class="detail-grid">
                            <section class="detail-section" id="detail-section-overview">
                                ${renderDeviceOverviewCard(detailData.base)}
                            </section>
                            <section class="detail-section" id="detail-section-status">
                                ${renderDeviceStatusCard(detailData.base, detailData.fault, detailRecordCounts)}
                            </section>
                            <section class="detail-section" id="detail-section-operation-summary">
                                ${renderDeviceOperationSummaryCard(detailData.entry, detailRecordCounts)}
                            </section>
                        </div>
                    </div>
                    ${renderDetailAside(detailData)}
                </div>
            `;
```

改后:

```javascript
            const detailBody = document.getElementById('detailModalBody');
            detailBody.innerHTML = renderDetailTabsShell(
                detailData.base,
                detailData.fault,
                detailData.entry,
                detailRecordCounts
            );
            switchDetailTab(readDetailTabFromHash());
```

⚠️ 注意 `renderDetailTabRun` 的签名需要 `summary` 作为第 1 个参数来读 `deviceId`(Task 5 里已调整过)。

- [ ] **Step 4: 调整 `renderDetailTabOverview` 调用** — spec 说用 `renderDeviceBasicCard`,但 main 上实际函数叫 `renderDeviceOverviewCard`(仅是命名差异)。Task 4 里写的代码要改为真实函数名:

```javascript
        function renderDetailTabOverview(summary, fault) {
            return `
                <div class="detail-tab-grid cols-2">
                    ${renderDeviceOverviewCard(summary)}
                    ${renderDeviceStatusCard(summary, fault)}
                </div>
            `;
        }
```

如果本 Task 前已经按 `renderDeviceBasicCard` 写了,这里一起修掉。

- [ ] **Step 5: 跑整个测试套件**

```bash
node --test tests/ 2>&1 | tail -15
```

预期: 与基线一致(4 known fail + 新增 tabs 测试全 PASS)。

- [ ] **Step 6: 浏览器手工验证**

```bash
python3 scripts/no_cache_http_server.py 8080 &
```

打开 `http://127.0.0.1:8080/devices.html`,点击任意设备"详情"。逐项核对:

1. 置顶头出现(返回、设备 ID、状态胶囊、点位、split button、远程操作、更多)
2. Tabs 栏 5 个,默认 "概览" 激活
3. 切换到 "运行" → 4 个温度瓦片 + 版本卡 + 运营参数卡 + 机构状态 chips + 温度报警设置 3 区
4. 切换到 "记录" → 状态记录 + 维护记录
5. 切换到 "入场" → 合约信息 + 点位变更历史
6. 切换到 "广告屏" → 基础卡片
7. 刷新页面,URL 里 `#tab=XXX` 保留,自动打开对应 tab
8. split button 的 hover / 主区点击 / ▾ 展开都工作
9. 关闭抽屉(点 modal 外 / 返回按钮 / Esc)回到列表

```bash
pkill -f "no_cache_http_server.py 8080"
```

- [ ] **Step 7: Commit**

```bash
git add devices.html tests/devices.detail-tabs.test.js
git commit -m "feat(devices): switch viewDetail to tabs layout"
```

---

## Task 10: 移除旧布局残留(CSS + HTML + sidebar)

**Files:**
- Modify: `devices.html`

- [ ] **Step 1: 扫描残留**

```bash
grep -n "detail-layout\|detail-side-action-list\|detail-side-title\|detail-side-action-btn\|detail-grid\|detail-main" devices.html
```

预期: 只剩 CSS 定义,controller 已无对应 HTML 拼接。

- [ ] **Step 2: 删除废弃 CSS**

删除这几组(每组连同响应式覆写一起):
- `.detail-layout`
- `.detail-main`
- `.detail-grid`
- `.detail-side-card`
- `.detail-side-title`
- `.detail-side-action-list`
- `.detail-side-action-btn`(含 `.primary` / `:hover`)

**保留:**
- `.detail-card-*` 系列(基本卡片容器,tab 内还在用)
- `.detail-row`、`.detail-fault-*`、`.detail-disclosure`(卡片子元素)
- `.detail-side-restart-*`(split button 在头部复用)
- 任何 tab/popover/temp-tile 相关新增 CSS

- [ ] **Step 3: 追加"残留已清"测试**

```javascript
// tests/devices.detail-tabs.test.js 末尾
test('旧 .detail-layout / .detail-side-action-list 等 CSS 已移除', () => {
  assert.ok(!/\.detail-layout\s*\{/.test(html), '.detail-layout 应移除');
  assert.ok(!/\.detail-main\s*\{/.test(html), '.detail-main 应移除');
  assert.ok(!/\.detail-side-action-list\s*\{/.test(html), '.detail-side-action-list 应移除');
  assert.ok(!/\.detail-side-action-btn\s*\{/.test(html), '.detail-side-action-btn 应移除');
});
```

- [ ] **Step 4: 跑完整测试**

```bash
node --test tests/ 2>&1 | tail -10
```

预期: 与基线一致。

- [ ] **Step 5: Commit**

```bash
git add devices.html tests/devices.detail-tabs.test.js
git commit -m "chore(devices): remove legacy detail-layout CSS after tabs migration"
```

---

## Task 11: 更新 Task 1 的 split button 测试断言(位置改到头部)

**Files:**
- Modify: `tests/devices.restart-split-button.test.js`

- [ ] **Step 1: 更新断言**

Task 1 里有断言 `侧栏应在远程操作按钮之前渲染 split button`,现在 split button 不在侧栏了。修改为断言 **头部** 里有:

```javascript
test('置顶头应渲染 split button 并置于远程操作按钮之前', () => {
  // 匹配 detail-top-head 内,split 在 blue button 之前
  const headBlock = html.match(/<div class="detail-top-head">[\s\S]*?<\/div>\s*`/);
  if (headBlock) {
    assert.ok(/detail-side-restart-split/.test(headBlock[0]),
      'split button 应出现在 detail-top-head 内');
  } else {
    // fallback: 全局检查 split 在模板字符串中
    assert.ok(/detail-top-head[\s\S]{0,2000}?detail-side-restart-split/.test(html));
  }
});
```

替换原本检查 `detail-side-action-list` 的那条断言。

- [ ] **Step 2: 跑测试**

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 全部 PASS。

- [ ] **Step 3: 全量测试**

```bash
node --test tests/ 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add tests/devices.restart-split-button.test.js
git commit -m "test(devices): update split-button location assertion to head"
```

---

## Task 12: 最终验证 + 回归测试

**Files:** 无代码改动

- [ ] **Step 1: 全量测试**

```bash
node --test tests/ 2>&1 | tail -15
```

预期: `pass=XX fail=4`(4 个已知 login/font-stack/device-search 基线失败保持不变)。

- [ ] **Step 2: 手工核对边界**

打开 http 服务器,核对:
1. 详情抽屉打开速度(tab 内容全在内存,切 tab 无网络请求)
2. 移动端(浏览器窗口 <768px)tabs 能横向滚动,卡片单列堆叠
3. 返回按钮关闭抽屉行为
4. URL hash 联动(可以直接 `devices.html#xxx&tab=run` 测试)

- [ ] **Step 3: 输出完成判据**

- [ ] `node --test tests/` 4 fail(基线)不增加
- [ ] 5 个 tab 都可切换且内容正确
- [ ] split button 在头部且功能正常
- [ ] 旧 `.detail-layout` / `.detail-side-action-*` 彻底移除
- [ ] 分支 `feat/restart-split-button` 共 11 次新 commit(Task 1 已 commit + Task 2-10 + Task 11 + Task 12 无改动),每次可独立回滚

---

## 执行选择

Plan complete and saved to `docs/superpowers/plans/2026-05-11-device-detail-page-tabs-redesign.md`. Two execution options:

**1. Subagent-Driven(强烈推荐)** — 每个 Task 派独立 subagent,fresh context,主会话只做 review + 决策。本 plan 有 11 个 task,subagent 方式速度和质量都更好

**2. Inline 逐步执行** — 在本会话里逐步跑,检查点停下来

Which approach?
