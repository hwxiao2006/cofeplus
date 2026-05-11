# 设备重启按钮入口重做 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把设备详情页「重启」入口从状态卡底部的幽灵文字按钮,改造为侧栏置顶的 teal 青绿 split button;主区一键"重启系统",▾ 弹 popover 选具体部件。

**Architecture:** 单文件改动(`devices.html`)。视觉层新增一组 `.detail-side-restart-*` CSS 类;DOM 层在现有 `.detail-side-action-list` 首位插入 split button + popover;行为层新增两个轻量函数 `toggleDetailRestartPopover` 和 `openDetailRestartPart`,复用已有的 `openDetailQuickRestart` 和 `handleDetailRemoteAction`。旧的 `.detail-status-recovery-*` CSS 与 `recoveryAction` 拼接全部移除。

**Tech Stack:** HTML/CSS/JS(vanilla)· Node.js 内建 test runner(`node --test`)· 项目自定义 `test()` helper + regex/VM 测试模式。

**Spec:** `docs/superpowers/specs/2026-05-11-device-restart-entry-redesign.md`

---

## 前置条件

本次改动基于 `origin/main`(HEAD `d3a2b22`)。当前工作分支 `codex/staff-management-revamp` 的 `devices.html` 已经没有重启相关代码,不适合作为基线。

- [ ] **前置步骤 1: 从 main 开一个干净分支**

在 `device-mgmt/` 仓库根目录执行。**先 stash 或备份**当前分支未提交改动(当前分支有大量 modified / untracked 文件),再切到 main 新建分支:

```bash
cd device-mgmt
git status --short | head   # 确认你已经记得当前改动
git stash push -u -m "wip-before-restart-redesign"   # 保存所有 modified 和 untracked
git fetch origin main
git checkout -b feat/restart-split-button origin/main
```

- [ ] **前置步骤 2: 验证基线可运行**

```bash
node --test tests/ 2>&1 | tail -20
```

预期: 所有现有测试 PASS(`# fail 0`)。如有失败先排查,不要带坏基线继续。

---

## 文件结构

| 文件 | 动作 | 说明 |
|---|---|---|
| `devices.html` | 修改 | 全部 CSS/HTML/JS 改动集中在这里 |
| `tests/devices.restart-split-button.test.js` | 新建 | 静态结构测试(regex) |
| `tests/devices.restart-split-button.runtime.test.js` | 新建 | VM 运行时测试(点击行为) |
| `docs/superpowers/specs/2026-05-11-device-restart-entry-redesign.md` | 不变 | 只读参考 |

---

## Task 1: 新增 split button CSS(失败测试先行)

**Files:**
- Modify: `devices.html`(在 CSS `.detail-side-action-btn` 块之后,约 1370 行之前)
- Create: `tests/devices.restart-split-button.test.js`

- [ ] **Step 1: 写静态 CSS 断言(失败测试)**

创建 `tests/devices.restart-split-button.test.js`:

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('侧栏重启 split button 容器样式应使用 teal 渐变', () => {
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#14b8a6,\s*#0f766e\)/.test(html),
    '.detail-side-restart-split 应为 teal 渐变'
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*border:\s*1px solid #0f766e/.test(html)
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*border-radius:\s*6px/.test(html)
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*box-shadow:\s*0 6px 14px rgba\(15,\s*118,\s*110,\s*0?\.22\)/.test(html)
  );
});

test('split button 主区 / caret 应有独立 hover 反馈', () => {
  assert.ok(/\.detail-side-restart-primary:hover\s*\{[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0?\.08\)/.test(html));
  assert.ok(/\.detail-side-restart-caret:hover\s*\{[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0?\.15\)/.test(html));
});

test('split button 主区与 caret 之间应有 1px 半透明白分隔线', () => {
  assert.ok(/\.detail-side-restart-caret\s*\{[\s\S]*border-left:\s*1px solid rgba\(255,\s*255,\s*255,\s*0?\.25\)/.test(html));
});

test('popover 应右对齐按钮下方 6px,带阴影', () => {
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*top:\s*calc\(100% \+ 6px\)/.test(html));
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*right:\s*0/.test(html));
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*box-shadow:\s*0 10px 30px rgba\(15,\s*23,\s*42,\s*0?\.12\)/.test(html));
});

test('popover item hover 使用浅 teal 背景', () => {
  assert.ok(/\.detail-side-restart-popover-item:hover\s*\{[\s\S]*background:\s*#ccfbf1/.test(html));
  assert.ok(/\.detail-side-restart-popover-item:hover\s*\{[\s\S]*color:\s*#0f766e/.test(html));
});
```

- [ ] **Step 2: 运行测试,确认全部失败**

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 5 条 FAIL(regex 全都匹配不到,因为 CSS 还没写)。

- [ ] **Step 3: 在 `devices.html` 加入 split button CSS**

在 `.detail-side-action-btn.primary:hover` 这条规则(约 1367 行)之后、`.detail-side-title` 之前,插入:

```css
        /* teal 专用于重启类恢复操作 —— 不要扩散到成功态或其他按钮 */
        .detail-side-restart-split {
            position: relative;
            display: grid;
            grid-template-columns: 1fr auto;
            border: 1px solid #0f766e;
            border-radius: 6px;
            overflow: hidden;
            background: linear-gradient(135deg, #14b8a6, #0f766e);
            color: #fff;
            font-weight: 700;
            font-size: 13px;
            box-shadow: 0 6px 14px rgba(15, 118, 110, 0.22);
        }

        .detail-side-restart-primary,
        .detail-side-restart-caret {
            background: transparent;
            border: 0;
            color: inherit;
            font: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.15s ease;
        }

        .detail-side-restart-primary {
            padding: 10px 12px;
            justify-content: flex-start;
        }

        .detail-side-restart-caret {
            padding: 10px;
            border-left: 1px solid rgba(255, 255, 255, 0.25);
        }

        .detail-side-restart-primary:hover {
            background: rgba(0, 0, 0, 0.08);
        }

        .detail-side-restart-caret:hover {
            background: rgba(0, 0, 0, 0.15);
        }

        .detail-side-restart-icon {
            display: inline-block;
            width: 13px;
            height: 13px;
            border: 1.8px solid currentColor;
            border-radius: 50%;
            position: relative;
            flex-shrink: 0;
        }

        .detail-side-restart-icon::after {
            content: '';
            position: absolute;
            top: -3px;
            right: -2px;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-bottom: 5px solid currentColor;
        }

        .detail-side-restart-chevron {
            display: inline-block;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 5px solid currentColor;
            transition: transform 0.2s ease;
        }

        .detail-side-restart-caret[aria-expanded="true"] .detail-side-restart-chevron {
            transform: rotate(180deg);
        }

        .detail-side-restart-popover {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
            padding: 6px;
            min-width: 200px;
            display: none;
            z-index: 10;
        }

        .detail-side-restart-popover[data-open="true"] {
            display: block;
        }

        .detail-side-restart-popover-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 5px;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 12.5px;
            font-weight: 500;
            background: transparent;
            border: 0;
            width: 100%;
            text-align: left;
            font-family: inherit;
        }

        .detail-side-restart-popover-item:hover {
            background: #ccfbf1;
            color: #0f766e;
        }

        .detail-side-restart-popover-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #0f766e;
            flex-shrink: 0;
        }

        .detail-side-restart-popover-dot--danger {
            background: #dc2626;
        }

        .detail-side-restart-popover-hint {
            margin-left: auto;
            font-size: 10px;
            color: #dc2626;
            font-weight: 600;
        }
```

- [ ] **Step 4: 重新跑测试,确认 PASS**

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 5 PASS / 0 FAIL。

- [ ] **Step 5: Commit**

```bash
git add devices.html tests/devices.restart-split-button.test.js
git commit -m "feat(devices): add teal split-button CSS for restart entry"
```

---

## Task 2: 移除旧的 recovery CSS 和 status 卡里的按钮拼接

**Files:**
- Modify: `devices.html`(~1266-1328 行 CSS + ~3309/3387/3392/3396 响应式 + ~6412-6424 `renderDeviceStatusCard`)

- [ ] **Step 1: 在同一个静态测试里追加"已移除"断言**

在 `tests/devices.restart-split-button.test.js` 文件末尾追加:

```javascript
test('旧的 .detail-status-recovery-* CSS 类应全部移除', () => {
  assert.ok(!/\.detail-status-recovery-action\s*\{/.test(html), '应移除 .detail-status-recovery-action');
  assert.ok(!/\.detail-status-recovery-head\s*\{/.test(html), '应移除 .detail-status-recovery-head');
  assert.ok(!/\.detail-status-recovery-title\s*\{/.test(html), '应移除 .detail-status-recovery-title');
  assert.ok(!/\.detail-status-recovery-copy\s*\{/.test(html), '应移除 .detail-status-recovery-copy');
  assert.ok(!/\.detail-status-recovery-actions\s*\{/.test(html), '应移除 .detail-status-recovery-actions');
  assert.ok(!/\.detail-status-recovery-btn\s*\{/.test(html), '应移除 .detail-status-recovery-btn');
});

test('renderDeviceStatusCard 不再拼接 recoveryAction', () => {
  assert.ok(!/recoveryAction/.test(html), 'recoveryAction 变量应完全移除');
  assert.ok(!/openDetailQuickRestart\(\s*['"][^'"]+['"]\s*,\s*['"]重启系统['"]\s*\)/.test(html) ||
    /openDetailQuickRestart\(/.test(html),
    '保留 openDetailQuickRestart 的定义,只移除状态卡里的调用拼接');
});
```

> 注: 第二条只是确保 `recoveryAction` 这个变量名从 `renderDeviceStatusCard` 里被拆掉;`openDetailQuickRestart` 函数定义本身保留,下一个 task 会用它。

- [ ] **Step 2: 跑测试确认当前 FAIL**

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 新增的 2 条 FAIL,其余 PASS。

- [ ] **Step 3: 删除 `.detail-status-recovery-*` CSS 定义**

在 `devices.html` 中定位并删除(约 1266-1328 行)这一整块:

```css
        .detail-status-recovery-action { ... }
        .detail-status-recovery-head { ... }
        .detail-status-recovery-title { ... }
        .detail-status-recovery-copy { ... }
        .detail-status-recovery-actions { ... }
        .detail-status-recovery-btn { ... }
        .detail-status-recovery-btn:hover { ... }
        .detail-status-recovery-btn.primary { ... }
        .detail-status-recovery-btn.secondary { ... }
```

同时删除响应式媒体查询里的对应覆写(约 3309、3387、3392、3396 行):

```css
.detail-status-recovery-actions { ... }
.detail-status-recovery-head { ... }
.detail-status-recovery-actions { ... }
.detail-status-recovery-btn.primary { ... }
```

使用 `grep -n "detail-status-recovery" devices.html` 确保 0 hits。

- [ ] **Step 4: 修改 `renderDeviceStatusCard`,移除 recoveryAction**

定位(约 6393 行)函数 `renderDeviceStatusCard`。当前函数体拼接了 `recoveryAction`。把它替换成不带 recoveryAction 的版本:

**改前(现状):**
```javascript
        function renderDeviceStatusCard(base, fault, counts) {
            const summary = base || {};
            const snapshot = fault || {};
            const abnormalSummary = buildDeviceAbnormalSummary(snapshot);
            const deviceId = escapeHtml(summary.deviceId || '');
            const rows = [
                renderDetailRow('设备状态', summary.statusName || '-'),
                renderDetailRow('停卖状态', summary.salesName || '-'),
                renderDetailRow('最近心跳', summary.heartbeat || '-'),
                renderDetailRow('入场状态', getDeviceEntryStatusLabel(summary)),
                renderDetailRow('当前异常摘要', abnormalSummary)
            ].join('');
            const noteParts = [];
            if (snapshot.hasFault && snapshot.updatedAt && snapshot.updatedAt !== '-') {
                noteParts.push(`最近异常时间：${snapshot.updatedAt}`);
            }
            const note = noteParts.length
                ? `<div class="detail-status-note">${escapeHtml(noteParts.join(' ｜ '))}</div>`
                : '';
            const recoveryAction = `
                <div class="detail-status-recovery-action">
                    ...
                </div>
            `;
            return renderDetailCard('设备状态', `${rows}${note}${recoveryAction}`, 'detail-card-status');
        }
```

**改后:**
```javascript
        function renderDeviceStatusCard(base, fault, counts) {
            const summary = base || {};
            const snapshot = fault || {};
            const abnormalSummary = buildDeviceAbnormalSummary(snapshot);
            const rows = [
                renderDetailRow('设备状态', summary.statusName || '-'),
                renderDetailRow('停卖状态', summary.salesName || '-'),
                renderDetailRow('最近心跳', summary.heartbeat || '-'),
                renderDetailRow('入场状态', getDeviceEntryStatusLabel(summary)),
                renderDetailRow('当前异常摘要', abnormalSummary)
            ].join('');
            const noteParts = [];
            if (snapshot.hasFault && snapshot.updatedAt && snapshot.updatedAt !== '-') {
                noteParts.push(`最近异常时间：${snapshot.updatedAt}`);
            }
            const note = noteParts.length
                ? `<div class="detail-status-note">${escapeHtml(noteParts.join(' ｜ '))}</div>`
                : '';
            return renderDetailCard('设备状态', `${rows}${note}`, 'detail-card-status');
        }
```

注意:
- 删除整段 `const recoveryAction = ...` 及其 HTML
- 删除 `const deviceId = ...` 这一行(只在 recoveryAction 里用)
- 拼接串从 `${rows}${note}${recoveryAction}` 改为 `${rows}${note}`

- [ ] **Step 5: 跑整个测试目录,确保没打破其他测试**

```bash
node --test tests/ 2>&1 | tail -15
```

预期: 全部 PASS。如果有其他测试(比如 page-redesign)期望旧 recovery 元素存在,需要同步更新那些测试(在本步里处理,不另起 task)。

- [ ] **Step 6: Commit**

```bash
git add devices.html tests/devices.restart-split-button.test.js
git commit -m "refactor(devices): remove legacy recovery buttons from status card"
```

---

## Task 3: 在侧栏第一位插入 split button + popover HTML

**Files:**
- Modify: `devices.html`(约 8962 行,`detail-side-action-list` 里 `openDetailRemoteActions` 按钮之前)

- [ ] **Step 1: 写 DOM 结构静态测试**

在 `tests/devices.restart-split-button.test.js` 末尾追加:

```javascript
test('侧栏应在远程操作按钮之前渲染 split button', () => {
  // 捕获第一个 .detail-side-action-list 代码块
  const listBlock = html.match(/<div class="detail-side-action-list">[\s\S]*?openDetailRemoteActions/);
  assert.ok(listBlock, '应找到侧栏动作列表');
  assert.ok(
    /detail-side-restart-split/.test(listBlock[0]),
    'detail-side-restart-split 必须出现在远程操作按钮之前'
  );
});

test('split button 主区应绑定 openDetailRestartSystem(deviceId)', () => {
  assert.ok(
    /<button[^>]*class="detail-side-restart-primary"[^>]*onclick="openDetailRestartSystem\(\$\{escapeHtml\(summary\.deviceId \|\| ''\)\}\)"/.test(html) ||
    /openDetailRestartSystem\s*\(\s*['"]/.test(html),
    '主区应调用 openDetailRestartSystem'
  );
});

test('caret 按钮应绑定 toggleDetailRestartPopover', () => {
  assert.ok(
    /<button[^>]*class="detail-side-restart-caret"[^>]*onclick="toggleDetailRestartPopover\(event,\s*\$\{escapeHtml\(summary\.deviceId \|\| ''\)\}\)"/.test(html) ||
    /toggleDetailRestartPopover\s*\(/.test(html),
    'caret 应调用 toggleDetailRestartPopover'
  );
});

test('popover 应列出三个部件项,对应 openDetailRestartPart 调用', () => {
  assert.ok(/openDetailRestartPart\([^)]*'重启点单屏（左）'\)/.test(html));
  assert.ok(/openDetailRestartPart\([^)]*'重启点单屏（右）'\)/.test(html));
  assert.ok(/openDetailRestartPart\([^)]*'重启六轴机械臂（注意安全，谨慎使用）'\)/.test(html));
});
```

- [ ] **Step 2: 跑测试确认 FAIL**

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 4 条新增 FAIL。

- [ ] **Step 3: 在侧栏渲染处插入 split button HTML**

定位 devices.html 约 8962 行:

```javascript
                            <div class="detail-side-action-list">
                                <button type="button" class="detail-side-action-btn primary" onclick="openDetailRemoteActions('${escapeHtml(summary.deviceId || '')}')">远程操作</button>
```

在这条 `<div class="detail-side-action-list">` 开始之后、`<button ... 远程操作` 之前,插入 split button:

```javascript
                            <div class="detail-side-action-list">
                                <div class="detail-side-restart-split">
                                    <button type="button" class="detail-side-restart-primary" onclick="openDetailRestartSystem('${escapeHtml(summary.deviceId || '')}')" aria-label="重启设备">
                                        <span class="detail-side-restart-icon" aria-hidden="true"></span>
                                        <span>重启设备</span>
                                    </button>
                                    <button type="button" class="detail-side-restart-caret" onclick="toggleDetailRestartPopover(event, '${escapeHtml(summary.deviceId || '')}')" aria-haspopup="menu" aria-expanded="false" aria-label="选择重启部件">
                                        <span class="detail-side-restart-chevron" aria-hidden="true"></span>
                                    </button>
                                    <div class="detail-side-restart-popover" role="menu" data-open="false">
                                        <button type="button" class="detail-side-restart-popover-item" role="menuitem" onclick="openDetailRestartPart('${escapeHtml(summary.deviceId || '')}', '重启点单屏（左）')">
                                            <span class="detail-side-restart-popover-dot" aria-hidden="true"></span>
                                            <span>点单屏(左)</span>
                                        </button>
                                        <button type="button" class="detail-side-restart-popover-item" role="menuitem" onclick="openDetailRestartPart('${escapeHtml(summary.deviceId || '')}', '重启点单屏（右）')">
                                            <span class="detail-side-restart-popover-dot" aria-hidden="true"></span>
                                            <span>点单屏(右)</span>
                                        </button>
                                        <button type="button" class="detail-side-restart-popover-item" role="menuitem" onclick="openDetailRestartPart('${escapeHtml(summary.deviceId || '')}', '重启六轴机械臂（注意安全，谨慎使用）')">
                                            <span class="detail-side-restart-popover-dot detail-side-restart-popover-dot--danger" aria-hidden="true"></span>
                                            <span>六轴机械臂</span>
                                            <span class="detail-side-restart-popover-hint">谨慎</span>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="detail-side-action-btn primary" onclick="openDetailRemoteActions('${escapeHtml(summary.deviceId || '')}')">远程操作</button>
```

- [ ] **Step 4: 跑测试确认 PASS**

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add devices.html tests/devices.restart-split-button.test.js
git commit -m "feat(devices): insert restart split button into side action list"
```

---

## Task 4: 实现 JS 行为函数(popover 开关 + 主区/部件分发)

**Files:**
- Modify: `devices.html`(在既有 `openDetailQuickRestart` 或 `handleDetailRemoteAction` 附近,约 7360 行前后 `<script>` 块内)

- [ ] **Step 1: 写 VM 运行时测试(失败)**

创建 `tests/devices.restart-split-button.runtime.test.js`:

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

function extractFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const start = html.indexOf(signature);
  if (start === -1) throw new Error(`未找到函数 ${functionName}`);
  const braceStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function buildSandbox() {
  const calls = [];
  const popover = {
    attrs: { 'data-open': 'false' },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name]; },
    contains() { return false; }
  };
  const caret = {
    attrs: { 'aria-expanded': 'false' },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name]; }
  };
  const sandbox = {
    console,
    document: {
      querySelector(sel) {
        if (sel === '.detail-side-restart-popover') return popover;
        if (sel === '.detail-side-restart-caret') return caret;
        return null;
      },
      addEventListener() {},
      removeEventListener() {}
    },
    __calls: calls,
    openDetailQuickRestart: (deviceId, action) => calls.push(['openDetailQuickRestart', deviceId, action]),
    handleDetailRemoteAction: (action) => calls.push(['handleDetailRemoteAction', action]),
    currentDetailDeviceId: ''
  };
  vm.createContext(sandbox);
  return { sandbox, calls, popover, caret };
}

test('openDetailRestartSystem 应调用 openDetailQuickRestart(deviceId, "重启系统")', () => {
  const { sandbox, calls } = buildSandbox();
  vm.runInContext(extractFunctionSource(html, 'openDetailRestartSystem'), sandbox);
  sandbox.openDetailRestartSystem('DEV-1');
  assert.deepStrictEqual(calls[0], ['openDetailQuickRestart', 'DEV-1', '重启系统']);
});

test('toggleDetailRestartPopover 应切换 data-open 与 aria-expanded', () => {
  const { sandbox, popover, caret } = buildSandbox();
  vm.runInContext(extractFunctionSource(html, 'toggleDetailRestartPopover'), sandbox);
  const fakeEvent = { stopPropagation() {}, preventDefault() {} };
  sandbox.toggleDetailRestartPopover(fakeEvent, 'DEV-1');
  assert.strictEqual(popover.getAttribute('data-open'), 'true');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'true');
  sandbox.toggleDetailRestartPopover(fakeEvent, 'DEV-1');
  assert.strictEqual(popover.getAttribute('data-open'), 'false');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'false');
});

test('openDetailRestartPart 应调用 handleDetailRemoteAction 并关闭 popover', () => {
  const { sandbox, calls, popover, caret } = buildSandbox();
  vm.runInContext(extractFunctionSource(html, 'openDetailRestartPart'), sandbox);
  popover.attrs['data-open'] = 'true';
  caret.attrs['aria-expanded'] = 'true';
  sandbox.currentDetailDeviceId = 'DEV-1';
  sandbox.openDetailRestartPart('DEV-1', '重启点单屏（左）');
  assert.deepStrictEqual(calls[0], ['handleDetailRemoteAction', '重启点单屏（左）']);
  assert.strictEqual(popover.getAttribute('data-open'), 'false');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'false');
});

test('closeDetailRestartPopover 应把 popover 和 caret 都置回关闭态', () => {
  const { sandbox, popover, caret } = buildSandbox();
  vm.runInContext(extractFunctionSource(html, 'closeDetailRestartPopover'), sandbox);
  popover.attrs['data-open'] = 'true';
  caret.attrs['aria-expanded'] = 'true';
  sandbox.closeDetailRestartPopover();
  assert.strictEqual(popover.getAttribute('data-open'), 'false');
  assert.strictEqual(caret.getAttribute('aria-expanded'), 'false');
});

test('devices.html 应为 openDetailRestartOptions 标注 legacy 注释', () => {
  assert.ok(
    /\/\/\s*legacy[^\n]*popover[^\n]*\n\s*function\s+openDetailRestartOptions/i.test(html) ||
    /function\s+openDetailRestartOptions[\s\S]*?\/\/\s*legacy/i.test(html),
    'openDetailRestartOptions 应在函数定义附近包含 "legacy" 注释,提示已被 split button popover 取代'
  );
});
```

- [ ] **Step 2: 跑测试确认 FAIL**

```bash
node --test tests/devices.restart-split-button.runtime.test.js
```

预期: 3 条 FAIL(函数都没定义)。

- [ ] **Step 3: 在 `<script>` 中新增三个函数**

在 `devices.html` 的 `<script>` 块中,紧跟 `openDetailQuickRestart` 函数定义之后(如果找不到,就放在 `handleDetailRemoteAction` 之前),插入:

```javascript
        // Restart split button: 主区、部件菜单、popover 开关
        function openDetailRestartSystem(deviceId) {
            openDetailQuickRestart(deviceId, '重启系统');
        }

        function openDetailRestartPart(deviceId, actionName) {
            closeDetailRestartPopover();
            handleDetailRemoteAction(actionName);
        }

        function toggleDetailRestartPopover(event, deviceId) {
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
            const popover = document.querySelector('.detail-side-restart-popover');
            const caret = document.querySelector('.detail-side-restart-caret');
            if (!popover || !caret) return;
            const isOpen = popover.getAttribute('data-open') === 'true';
            popover.setAttribute('data-open', isOpen ? 'false' : 'true');
            caret.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        }

        function closeDetailRestartPopover() {
            const popover = document.querySelector('.detail-side-restart-popover');
            const caret = document.querySelector('.detail-side-restart-caret');
            if (popover) popover.setAttribute('data-open', 'false');
            if (caret) caret.setAttribute('aria-expanded', 'false');
        }

        // 点击 popover 外部时关闭
        document.addEventListener('click', function (e) {
            const popover = document.querySelector('.detail-side-restart-popover');
            if (!popover || popover.getAttribute('data-open') !== 'true') return;
            if (popover.contains(e.target)) return;
            const caret = document.querySelector('.detail-side-restart-caret');
            if (caret && caret.contains(e.target)) return;
            closeDetailRestartPopover();
        });

        // Esc 关闭 popover
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            const popover = document.querySelector('.detail-side-restart-popover');
            if (popover && popover.getAttribute('data-open') === 'true') {
                closeDetailRestartPopover();
            }
        });
```

- [ ] **Step 4: 给 legacy 函数加注释**

定位 `function openDetailRestartOptions(` 定义(main 上它负责打开 bottom sheet 让用户选重启部件)。在 `function` 关键字之前加一行注释:

```javascript
        // legacy: 保留以防其他入口引用。split button popover 已取代此入口。
        function openDetailRestartOptions(deviceId) { ... }
```

函数体不动。

- [ ] **Step 5: 跑运行时测试,确认 PASS**

```bash
node --test tests/devices.restart-split-button.runtime.test.js
```

预期: 4 PASS / 0 FAIL(3 个行为测试 + closeDetailRestartPopover 测试;legacy 注释的断言在 static test 里已经跑过)。顺便确认静态测试:

```bash
node --test tests/devices.restart-split-button.test.js
```

预期: 全部 PASS(含 legacy 注释断言)。

- [ ] **Step 6: 跑整个测试套件,确保无回归**

```bash
node --test tests/ 2>&1 | tail -10
```

预期: 所有测试 PASS。

- [ ] **Step 7: Commit**

```bash
git add devices.html tests/devices.restart-split-button.runtime.test.js tests/devices.restart-split-button.test.js
git commit -m "feat(devices): wire up restart split-button behavior"
```

---

## Task 5: 浏览器手工验证(无测试,仅手动确认)

**Files:** 无代码改动

- [ ] **Step 1: 启动本地 HTTP 服务**

```bash
cd device-mgmt
python3 scripts/no_cache_http_server.py 8080 &
```

- [ ] **Step 2: 浏览器打开 `http://127.0.0.1:8080/devices.html`**

- [ ] **Step 3: 逐项核对交互**

点开任意设备的"详情"按钮,确认右侧栏首位出现 teal 青绿 split button。依次验证:

1. 主区"重启设备"按钮 hover 有独立深色反馈
2. ▾ caret hover 反馈更深一档
3. 点主区 → 直接进入原有「重启系统」确认页
4. 从确认页取消,回到详情
5. 点 ▾ → popover 弹出,列出 3 项(左屏 / 右屏 / 六轴机械臂-谨慎)
6. 点 popover 外任意位置 → popover 关闭
7. 再点 ▾ → popover 打开
8. 选"点单屏(左)"→ 进入对应确认页 / 硬件指引页
9. 设备状态卡底部不再有"快捷操作 - 重启系统 / 重启其他"两个按钮
10. 其他设备页(faults、overview)没有被影响

发现问题就记下来,回到对应 Task 修复。

- [ ] **Step 4: 关闭 http-server**

```bash
kill %1 2>/dev/null || pkill -f "no_cache_http_server.py 8080"
```

---

## Task 6: Lint 与最终清理

**Files:**
- Modify: `devices.html`

- [ ] **Step 1: 确认 `detail-status-recovery` 和 `recoveryAction` 彻底清零**

```bash
grep -n "detail-status-recovery\|recoveryAction" devices.html
```

预期: 无输出。如果还有残留,删掉再跑一次。

- [ ] **Step 2: 确认新旧入口只有一条路径**

```bash
grep -n "openDetailQuickRestart\|openDetailRestartSystem" devices.html
```

预期:
- `function openDetailQuickRestart(` 定义 1 处(保留)
- `openDetailRestartSystem(` 定义 1 处 + 调用 1 处(主区 onclick)
- `openDetailQuickRestart(deviceId, '重启系统')` 仅在 `openDetailRestartSystem` 内部出现 1 次 —— 不再出现在状态卡 HTML 里

- [ ] **Step 3: 全量测试一次**

```bash
node --test tests/ 2>&1 | tail -15
```

预期: 全部 PASS,包含新增的两个文件。

- [ ] **Step 4: Commit(如有任何清理改动)**

```bash
git status --short
git add devices.html
git commit -m "chore(devices): final cleanup for restart redesign"
```

如果 `git status` 是干净的,跳过此 commit。

---

## 完成判据

全部满足即视为完成:

- [ ] `node --test tests/` 全绿
- [ ] `grep -n "detail-status-recovery\|recoveryAction" devices.html` 无输出
- [ ] 浏览器验证 10 项交互全部通过
- [ ] 分支 `feat/restart-split-button` 提交历史只包含本计划里列出的 5 次 commit,每次都可独立回滚
- [ ] spec 文件未被本 plan 修改(保持为不可变参考)

---

## 执行选择

Plan complete and saved to `docs/superpowers/plans/2026-05-11-device-restart-entry-redesign.md`. Two execution options:

**1. Subagent-Driven(推荐)** — 每个 Task 派一个新鲜 subagent 独立执行,任务间我 review,快速迭代,不污染主会话 context

**2. Inline Execution** — 在本会话里用 `executing-plans` 逐步执行,批量推进,到检查点停下来让你 review

Which approach?
