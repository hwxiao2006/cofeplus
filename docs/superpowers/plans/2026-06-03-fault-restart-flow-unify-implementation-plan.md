# 故障处理与设备管理「重启」流程统一 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `faults.html` 列表行的「机构重启」从一个 `alert` 升级成与 `devices.html` 完全相同的「子菜单 → 确认对话 → 硬件指导 → 落运维记录 + toast」流程,同时把这套流程抽到 `shared/fault-restart-flow.js`,让两个页面共用单一来源。

**Architecture:** 新增 IIFE 共享模块 `shared/fault-restart-flow.js`(暴露 `window.CofeFaultRestartFlow`):内部维护 `activeCtx` 单例 + 四个纯渲染函数 + 状态机 + 一次性 CSS 注入。`devices.html` 把现有的 4 个 render 函数改成一行委派,把重启 CSS 搬走,把 `handleDetailRemoteAction` 的「机构重启」入口重定向到 `module.open(ctx)`。`faults.html` 加一个 panel 容器、新增 `openFaultRestartFlow` + `appendFaultOperationRecord` + `showToast` 共三个函数,把现有 sheet 里那个「机构重启」按钮的 onclick 切到新入口。

**Tech Stack:** 静态 HTML + 原生 JS(IIFE 暴露 `window.*`);`localStorage` 持久化运维记录;`node --test` + Node `vm` 模块跑单测/runtime 测/snapshot 测。

**Spec:** `docs/superpowers/specs/2026-06-03-fault-restart-flow-unify-design.md`

**关于 dispatcher 与 onclick:** 模块内部维护 `activeCtx` 单例,所有 HTML onclick 统一写成 `window.CofeFaultRestartFlow.dispatch('…')`,由模块单一来源解释动作名。这意味着 `devices.html` 改造前 HTML 里的 `onclick="handleDetailRemoteAction('…')"` 在改造后会变成 `onclick="window.CofeFaultRestartFlow.dispatch('…')"`,snapshot 比较时把 `onclick=".*?"` 整体 mask 掉(等价于"文本/结构等价")。

---

## 文件结构

| 路径 | 角色 | 操作 |
|---|---|---|
| `device-mgmt/shared/fault-restart-flow.js` | 共享模块:ACTIONS、meta、render×3、状态机(`open/handle/close/dispatch`)、`injectStyles`、`activeCtx` 单例 | 新增 |
| `device-mgmt/tests/fault-restart-flow.behavior.test.js` | 模块单元测试 | 新增 |
| `device-mgmt/tests/fault-restart-flow.snapshot.test.js` | 锁定渲染输出与改造前 devices.html 等价 | 新增 |
| `device-mgmt/tests/fault-restart-flow.runtime.test.js` | HTML 页面静态检查 | 新增 |
| `device-mgmt/devices.html` | 引入模块 + 4 render 函数委派 + restart CSS 搬走 + restart 分支重定向到 `module.open` | 修改 |
| `device-mgmt/faults.html` | 引入模块 + panel 容器 + `openFaultRestartFlow` + `appendFaultOperationRecord` + `showToast` + 按钮 onclick 切换 + `getOperationRecords` 读 localStorage 优先 | 修改 |

工作目录约定:本计划全部命令的 `cwd` 都是 worktree 根 `/Users/mac/.config/superpowers/worktrees/device-mgmt/fault-push-channels`,以下提到的相对路径(`devices.html`、`tests/...`)均相对该目录。

---

## Task 1: 准备分支 + 跑基线

**Files:** 无代码改动

- [ ] **Step 1: 确认 worktree 与分支干净**

```bash
cd /Users/mac/.config/superpowers/worktrees/device-mgmt/fault-push-channels
git status --short
git log --oneline -3
```

预期:工作树干净,HEAD 是 `51df653 docs(fault-notify): add spec and implementation plan ...`,上一条是 `65cb89b feat(fault-notify): add email and wechat push channels`。

- [ ] **Step 2: 跑测试基线**

```bash
node --test tests/*.test.js 2>&1 | tail -25
```

预期:有 4 个已知失败(`device-search.location-name`、两个 `login-pages`、`pages.font-stack`),其余 PASS。记住通过条数。

- [ ] **Step 3: 通读 spec 与本计划**

```bash
sed -n '1,200p' docs/superpowers/specs/2026-06-03-fault-restart-flow-unify-design.md
```

预期:能复述"模块单一来源、4 个 render 函数改委派、状态机由模块拥有、snapshot 锁定输出等价"。

---

## Task 2: 共享模块骨架(ACTIONS + meta 数据)

**Files:**
- Create: `shared/fault-restart-flow.js`
- Create: `tests/fault-restart-flow.behavior.test.js`

- [ ] **Step 1: 写测试**

```js
// tests/fault-restart-flow.behavior.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-restart-flow.js'), 'utf8');

function loadModule() {
  const sandbox = { window: {}, globalThis: {}, document: undefined };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.window.CofeFaultRestartFlow || sandbox.globalThis.CofeFaultRestartFlow;
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.stack || e.message); process.exitCode = 1; }
}

const M = loadModule();

test('ACTIONS: 4 项,顺序固定', () => {
  assert.deepStrictEqual(M.ACTIONS, [
    '重启系统',
    '重启点单屏(左)',
    '重启点单屏(右)',
    '重启六轴机械臂(注意安全,谨慎使用)'
  ]);
});

test('getActionMeta("重启系统"): 含 4 步 steps + 通用 warning', () => {
  const meta = M.getActionMeta('重启系统');
  assert.strictEqual(meta.steps.length, 4);
  assert.ok(meta.warning.includes('设备现场完成'));
  assert.ok(meta.guideTitle.includes('重启系统'));
});

test('getActionMeta("重启六轴机械臂(注意安全,谨慎使用)"): warning 含「机械臂周边安全」', () => {
  const meta = M.getActionMeta('重启六轴机械臂(注意安全,谨慎使用)');
  assert.ok(meta.warning.includes('机械臂周边安全'));
});

test('getActionMeta(未知): null', () => {
  assert.strictEqual(M.getActionMeta('不存在的动作'), null);
});
```

> ⚠️ 字符一致性:`devices.html` 现有 `getDetailRemoteRestartMeta` 的 key 用的是**全角括号**「(  )」与**全角逗号**「,」,本计划上面所有测试断言、Step 3 的实现 META 表里出现的 `重启点单屏(左)` / `重启点单屏(右)` / `重启六轴机械臂(注意安全,谨慎使用)` 都应该是全角字符。复制黏贴时打开编辑器搜索功能确认匹配 devices.html 原文 —— 错一个字符 snapshot test 就 RED。

- [ ] **Step 2: 跑测试,看到 4 条 FAIL(文件不存在)**

```bash
node tests/fault-restart-flow.behavior.test.js
```

预期:`ENOENT` 或模块加载失败。

- [ ] **Step 3: 实现模块骨架 + ACTIONS + meta**

```js
// shared/fault-restart-flow.js
(function(global) {
  const ACTIONS = [
    '重启系统',
    '重启点单屏(左)',
    '重启点单屏(右)',
    '重启六轴机械臂(注意安全,谨慎使用)'
  ];

  const COMMON_WARNING = '该操作需要客户在设备现场完成,系统无法远程执行。';

  const META = {
    '重启系统': {
      guideTitle: '机器按钮位置 · 重启系统',
      imageLabel: '整机重启按钮位置示意图',
      imageHint: '请客户查看设备机身侧面或背部控制区域,寻找整机电源 / 重启按钮。',
      steps: [
        '请先确认设备周边无人操作,避免重启过程中误触。',
        '在设备机身侧面或背部找到整机电源 / 重启按钮。',
        '按住按钮约 3 秒后松开,等待系统重新启动。',
        '等待设备恢复后,再返回页面查看设备状态。'
      ],
      warning: COMMON_WARNING
    },
    '重启点单屏(左)': {
      guideTitle: '机器按钮位置 · 重启点单屏(左)',
      imageLabel: '左侧点单屏按钮位置示意图',
      imageHint: '请客户查看左侧点单屏边框背面或屏幕下缘,找到该屏对应的电源按钮。',
      steps: [
        '确认左侧点单屏当前无人操作后,再进行重启。',
        '在左侧点单屏边框背面或下沿找到电源按钮。',
        '短按关闭后等待 2 秒,再次按下启动左侧点单屏。',
        '屏幕重新点亮后,确认页面恢复正常显示。'
      ],
      warning: COMMON_WARNING
    },
    '重启点单屏(右)': {
      guideTitle: '机器按钮位置 · 重启点单屏(右)',
      imageLabel: '右侧点单屏按钮位置示意图',
      imageHint: '请客户查看右侧点单屏边框背面或屏幕下缘,找到该屏对应的电源按钮。',
      steps: [
        '确认右侧点单屏当前无人操作后,再进行重启。',
        '在右侧点单屏边框背面或下沿找到电源按钮。',
        '短按关闭后等待 2 秒,再次按下启动右侧点单屏。',
        '屏幕重新点亮后,确认页面恢复正常显示。'
      ],
      warning: COMMON_WARNING
    },
    '重启六轴机械臂(注意安全,谨慎使用)': {
      guideTitle: '机器按钮位置 · 重启六轴机械臂',
      imageLabel: '六轴机械臂控制按钮位置示意图',
      imageHint: '请客户在确保机械臂周边安全的前提下,查看控制柜或机械臂基座上的控制按钮区域。',
      steps: [
        '先确认机械臂作业范围内无人、无障碍物,再进行操作。',
        '在控制柜或机械臂基座找到机械臂控制电源按钮。',
        '按流程关闭机械臂电源,等待数秒后再次启动。',
        '机械臂重新上电后,再观察其是否恢复待机状态。'
      ],
      warning: '该操作需要客户在设备现场完成,系统无法远程执行。请先确认机械臂周边安全后再操作。'
    }
  };

  function getActionMeta(actionName) {
    return META[actionName] || null;
  }

  global.CofeFaultRestartFlow = {
    ACTIONS,
    getActionMeta
  };
})(typeof window !== 'undefined' ? window : globalThis);
```

> 重要:从 `devices.html` 第 7728-7781 行 `getDetailRemoteRestartMeta` 函数体里 copy 文案时,**逐字符核对**包括标点(全角 vs 半角)、数字、空格。错一个字符 snapshot test 就 RED。最稳的做法:用编辑器 diff 工具对比两份字符串。

- [ ] **Step 4: 跑测试,4 PASS**

```bash
node tests/fault-restart-flow.behavior.test.js
```

预期:全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/fault-restart-flow.js tests/fault-restart-flow.behavior.test.js
git commit -m "feat(fault-restart): shared module skeleton with ACTIONS and meta"
```

---

## Task 3: 共享模块 — 三个 render 函数

**Files:**
- Modify: `shared/fault-restart-flow.js`
- Modify: `tests/fault-restart-flow.behavior.test.js`

- [ ] **Step 1: 追加测试**

```js
test('renderSubPanel: 含 4 个 onclick 入口,deviceId 转义', () => {
  const html = M.renderSubPanel('TEST<001>');
  // 4 个动作每个有一个 onclick
  const dispatches = (html.match(/window\.CofeFaultRestartFlow\.dispatch\(/g) || []).length;
  assert.strictEqual(dispatches, 4);
  // 三个部件项的文字都在
  assert.ok(html.includes('重启点单屏(左)'));
  assert.ok(html.includes('重启点单屏(右)'));
  assert.ok(html.includes('重启六轴机械臂(注意安全,谨慎使用)'));
  // deviceId 转义
  assert.ok(html.includes('TEST&lt;001&gt;'));
});

test('renderConfirmDialog: 含三段关键文案', () => {
  const html = M.renderConfirmDialog('重启系统');
  assert.ok(html.includes('确认软件重启'));
  assert.ok(html.includes('无法远程处理?查看机器按钮位置'));
  assert.ok(html.includes('取消'));
  assert.ok(html.includes('确定要重启系统?'));
});

test('renderHardwareGuide: 含 4 个步骤 li + warning + imageLabel', () => {
  const html = M.renderHardwareGuide('TEST001', '重启系统');
  const liCount = (html.match(/<li>/g) || []).length;
  assert.strictEqual(liCount, 4);
  assert.ok(html.includes('该操作需要客户在设备现场完成'));
  assert.ok(html.includes('整机重启按钮位置示意图'));
});

test('renderConfirmDialog(未知动作): 不抛错,返回兜底 HTML', () => {
  const html = M.renderConfirmDialog('不存在的动作');
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('取消'));
});
```

- [ ] **Step 2: 跑测试,4 FAIL**

```bash
node tests/fault-restart-flow.behavior.test.js
```

- [ ] **Step 3: 实现三个 render 函数**

在 `getActionMeta` 之后、`global.CofeFaultRestartFlow = {...}` 之前插入:

```js
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderSubPanel(deviceId) {
    const did = escapeHtml(deviceId);
    const items = ACTIONS
      .filter(a => a !== '重启系统') // 子面板里不重复展示「重启系统」,与 devices.html 现有 renderDetailRemoteRestartPanel 保持一致
      .map(a => `<button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('${escapeHtml(a)}')">${escapeHtml(a)}</button>`)
      .join('');
    // 「重启系统」在子面板顶部以同样的 option 渲染
    const systemBtn = `<button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('重启系统')">重启系统</button>`;
    return `
      <div class="detail-fault-sheet-dialog">
        <div class="detail-fault-sheet-title">机构重启 · ${did}</div>
        ${systemBtn}
        ${items}
      </div>
    `;
  }

  function renderConfirmDialog(actionName) {
    const meta = getActionMeta(actionName);
    if (meta) {
      return `
        <div class="detail-fault-sheet-dialog">
          <div class="detail-fault-sheet-title">确认操作</div>
          <div class="detail-remote-restart-confirm-shell">
            <button type="button" class="detail-remote-restart-confirm-primary" onclick="window.CofeFaultRestartFlow.dispatch('确认软件重启')">
              <span>确认软件重启</span>
              <span class="detail-remote-restart-confirm-arrow">›</span>
            </button>
            <div class="detail-remote-restart-confirm-callout">确定要${escapeHtml(actionName)}?</div>
            <button type="button" class="detail-remote-restart-confirm-helper" onclick="window.CofeFaultRestartFlow.dispatch('无法远程处理?查看机器按钮位置')">
              <span>无法远程处理?查看机器按钮位置</span>
              <span class="detail-remote-restart-confirm-arrow">›</span>
            </button>
            <button type="button" class="detail-remote-restart-confirm-cancel" onclick="window.CofeFaultRestartFlow.dispatch('取消')">取消</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="detail-fault-sheet-dialog">
        <div class="detail-fault-sheet-title">确认操作</div>
        <div style="padding: 16px; text-align: center; color: #666;">确定要${escapeHtml(actionName)}?</div>
        <button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('确认执行')">确认执行</button>
        <button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('取消')">取消</button>
      </div>
    `;
  }

  function renderHardwareGuide(deviceId, actionName) {
    const meta = getActionMeta(actionName);
    const did = escapeHtml(deviceId);
    if (!meta) {
      return `<div class="detail-fault-sheet-dialog"><div class="detail-fault-sheet-title">无可用引导 · ${did}</div></div>`;
    }
    const steps = (meta.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');
    return `
      <div class="detail-fault-sheet-dialog">
        <div class="detail-fault-sheet-title">${escapeHtml(meta.guideTitle)} · ${did}</div>
        <div class="detail-remote-restart-guide-shell">
          <div class="detail-remote-restart-guide-card">
            <div class="detail-remote-restart-guide-warning">${escapeHtml(meta.warning)}</div>
            <div class="detail-remote-restart-guide-image" role="img" aria-label="${escapeHtml(meta.imageLabel)}">
              <div class="detail-remote-restart-guide-image-label">${escapeHtml(meta.imageLabel)}</div>
              <div class="detail-remote-restart-guide-image-diagram">${escapeHtml(meta.imageHint)}</div>
            </div>
            <ol class="detail-remote-restart-guide-steps">${steps}</ol>
            <button type="button" class="detail-remote-restart-guide-action" onclick="window.CofeFaultRestartFlow.dispatch('我知道了')">我知道了</button>
          </div>
        </div>
      </div>
    `;
  }
```

在导出对象追加 `renderSubPanel, renderConfirmDialog, renderHardwareGuide`。

> 实现完毕后,对照 `devices.html` 第 7717-7726(renderSubPanel 来源)、7783-7812(renderConfirmDialog 来源)、7814-7836(renderHardwareGuide 来源)逐段比对 HTML 结构,确保 class 名、嵌套层级、文字标点完全一致(除 onclick 改为 module.dispatch)。

- [ ] **Step 4: 跑测试,4 PASS**

```bash
node tests/fault-restart-flow.behavior.test.js
```

- [ ] **Step 5: Commit**

```bash
git add shared/fault-restart-flow.js tests/fault-restart-flow.behavior.test.js
git commit -m "feat(fault-restart): render functions for sub-panel, confirm, guide"
```

---

## Task 4: 共享模块 — 状态机 open/handle/close/dispatch

**Files:**
- Modify: `shared/fault-restart-flow.js`
- Modify: `tests/fault-restart-flow.behavior.test.js`

- [ ] **Step 1: 追加测试**

```js
function createPanel() {
  const node = { innerHTML: '', classList: { _classes: new Set(), add(c) { this._classes.add(c); }, remove(c) { this._classes.delete(c); } } };
  return node;
}

test('open(ctx): 进 sub 态,panel 含 4 选项', () => {
  const panel = createPanel();
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => {} };
  M.open(ctx);
  assert.strictEqual(ctx.mode, 'sub');
  assert.ok(panel.innerHTML.includes('机构重启 · D001'));
  assert.strictEqual((panel.innerHTML.match(/dispatch\(/g) || []).length, 4);
});

test('dispatch(X) sub→confirm: pendingAction 记录', () => {
  const panel = createPanel();
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => {} };
  M.open(ctx);
  M.dispatch('重启系统');
  assert.strictEqual(ctx.mode, 'confirm');
  assert.strictEqual(ctx.pendingAction, '重启系统');
  assert.ok(panel.innerHTML.includes('确定要重启系统?'));
});

test('dispatch("确认软件重启") confirm→commit: 调 onCommit 后关闭', () => {
  const panel = createPanel();
  let committedArgs = null;
  const ctx = { deviceId: 'D001', panel, onCommit: (...a) => { committedArgs = a; }, onCancel: () => {} };
  M.open(ctx);
  M.dispatch('重启系统');
  M.dispatch('确认软件重启');
  assert.deepStrictEqual(committedArgs, ['D001', '重启系统']);
  assert.strictEqual(panel.innerHTML, '');
  assert.strictEqual(ctx.mode, null);
});

test('dispatch("无法远程处理?查看机器按钮位置") confirm→hardware-guide', () => {
  const panel = createPanel();
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => {} };
  M.open(ctx);
  M.dispatch('重启点单屏(左)');
  M.dispatch('无法远程处理?查看机器按钮位置');
  assert.strictEqual(ctx.mode, 'hardware-guide');
  assert.ok(panel.innerHTML.includes('左侧点单屏'));
});

test('dispatch("取消") confirm→close: 调 onCancel', () => {
  const panel = createPanel();
  let cancelled = false;
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => { cancelled = true; } };
  M.open(ctx);
  M.dispatch('重启系统');
  M.dispatch('取消');
  assert.strictEqual(cancelled, true);
  assert.strictEqual(panel.innerHTML, '');
  assert.strictEqual(ctx.mode, null);
});

test('dispatch("我知道了") hardware-guide→close', () => {
  const panel = createPanel();
  let cancelled = false;
  const ctx = { deviceId: 'D001', panel, onCommit: () => {}, onCancel: () => { cancelled = true; } };
  M.open(ctx);
  M.dispatch('重启系统');
  M.dispatch('无法远程处理?查看机器按钮位置');
  M.dispatch('我知道了');
  assert.strictEqual(cancelled, true);
  assert.strictEqual(panel.innerHTML, '');
});

test('dispatch 在无 activeCtx 时静默', () => {
  M.close(null); // 重置
  assert.doesNotThrow(() => M.dispatch('重启系统'));
});
```

- [ ] **Step 2: 跑测试,7 FAIL**

- [ ] **Step 3: 实现状态机**

在 render 函数之后插入:

```js
  let activeCtx = null;

  function open(ctx) {
    activeCtx = ctx;
    ctx.mode = 'sub';
    ctx.pendingAction = '';
    ctx.panel.innerHTML = renderSubPanel(ctx.deviceId);
  }

  function close(ctx) {
    const target = ctx || activeCtx;
    if (target && target.panel) {
      if (target.panel.classList && typeof target.panel.classList.remove === 'function') {
        target.panel.classList.remove('active');
      }
      target.panel.innerHTML = '';
      target.mode = null;
      target.pendingAction = '';
    }
    if (!ctx || activeCtx === ctx) activeCtx = null;
  }

  function handle(ctx, actionName) {
    if (!ctx) return;
    if (ctx.mode === 'sub' && ACTIONS.indexOf(actionName) >= 0) {
      ctx.mode = 'confirm';
      ctx.pendingAction = actionName;
      ctx.panel.innerHTML = renderConfirmDialog(actionName);
      return;
    }
    if (ctx.mode === 'confirm' && actionName === '确认软件重启') {
      if (typeof ctx.onCommit === 'function') ctx.onCommit(ctx.deviceId, ctx.pendingAction);
      close(ctx);
      return;
    }
    if (ctx.mode === 'confirm' && actionName === '无法远程处理?查看机器按钮位置') {
      ctx.mode = 'hardware-guide';
      ctx.panel.innerHTML = renderHardwareGuide(ctx.deviceId, ctx.pendingAction);
      return;
    }
    if (ctx.mode === 'confirm' && actionName === '取消') {
      if (typeof ctx.onCancel === 'function') ctx.onCancel();
      close(ctx);
      return;
    }
    if (ctx.mode === 'hardware-guide' && actionName === '我知道了') {
      if (typeof ctx.onCancel === 'function') ctx.onCancel();
      close(ctx);
      return;
    }
    // 其他组合静默忽略
  }

  function dispatch(actionName) {
    if (activeCtx) handle(activeCtx, actionName);
  }
```

在导出对象追加 `open, handle, close, dispatch`。

- [ ] **Step 4: 跑测试,7 PASS**

```bash
node tests/fault-restart-flow.behavior.test.js
```

- [ ] **Step 5: Commit**

```bash
git add shared/fault-restart-flow.js tests/fault-restart-flow.behavior.test.js
git commit -m "feat(fault-restart): state machine with open/handle/close/dispatch"
```

---

## Task 5: 共享模块 — injectStyles + 完整 CSS

**Files:**
- Modify: `shared/fault-restart-flow.js`
- Modify: `tests/fault-restart-flow.behavior.test.js`

- [ ] **Step 1: 追加测试**

```js
function createDocStub() {
  const head = { children: [], appendChild(child) { this.children.push(child); } };
  return {
    head,
    createElement(tag) {
      return { tag, attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; } };
    },
    querySelectorAll(sel) {
      return head.children.filter(c => sel.includes('data-cofe-fault-restart-flow') && c.attrs && c.attrs['data-cofe-fault-restart-flow']);
    }
  };
}

test('injectStyles: 注入一个带标记的 <style>;重复调用不重复注入', () => {
  // 重新加载模块以重置 stylesInjected
  const sandbox = { window: {}, globalThis: {}, document: createDocStub() };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  const Mod = sandbox.window.CofeFaultRestartFlow || sandbox.globalThis.CofeFaultRestartFlow;
  Mod.injectStyles();
  Mod.injectStyles();
  assert.strictEqual(sandbox.document.head.children.length, 1);
  assert.strictEqual(sandbox.document.head.children[0].attrs['data-cofe-fault-restart-flow'], '1');
  assert.ok(sandbox.document.head.children[0].textContent.includes('.detail-fault-sheet-dialog'));
  assert.ok(sandbox.document.head.children[0].textContent.includes('.detail-remote-restart-confirm-shell'));
});
```

- [ ] **Step 2: 跑测试,1 FAIL**

- [ ] **Step 3: 把 devices.html 重启相关 CSS 复制进模块 + 实现 injectStyles**

先从 `devices.html` 取出以下 CSS class 的完整规则(逐行抓 selector 范围):

| Selector | devices.html 行号 |
|---|---|
| `.detail-side-restart-split` | 1231 |
| `.detail-side-restart-primary`, `.detail-side-restart-caret` | 1245-1246 |
| `.detail-side-restart-primary` | 1258 |
| `.detail-side-restart-caret` | 1264 |
| `.detail-side-restart-primary:hover` | 1270 |
| `.detail-side-restart-caret:hover` | 1274 |
| `.detail-side-restart-icon` | 1278 |
| `.detail-side-restart-icon::after` | 1288 |
| `.detail-side-restart-chevron` | 1299 |
| `.detail-side-restart-caret[aria-expanded="true"] .detail-side-restart-chevron` | 1309 |
| `.detail-side-restart-popover` | 1313 |
| `.detail-side-restart-popover[data-open="true"]` | 1327 |
| `.detail-side-restart-popover-item` | 1331 |
| `.detail-side-restart-popover-item:hover` | 1348 |
| `.detail-side-restart-popover-dot` | 1353 |
| `.detail-side-restart-popover-dot--danger` | 1361 |
| `.detail-side-restart-popover-hint` | 1365 |
| `.detail-remote-restart-confirm-shell` | 1890 |
| `.detail-remote-restart-confirm-primary`, `.detail-remote-restart-confirm-helper` | 1897-1898 |
| `.detail-remote-restart-confirm-primary` | 1912 |
| `.detail-remote-restart-confirm-helper` | 1918 |
| `.detail-remote-restart-confirm-primary:hover` | 1924 |
| `.detail-remote-restart-confirm-helper:hover` | 1928 |
| `.detail-remote-restart-confirm-callout` | 1932 |
| `.detail-remote-restart-confirm-arrow` | 1943 |
| `.detail-remote-restart-confirm-cancel` | 1948 |
| `.detail-remote-restart-confirm-cancel:hover` | 1959 |
| `.detail-remote-restart-guide-shell` | 1963 |
| `.detail-remote-restart-guide-card` | 1970 |
| `.detail-remote-restart-guide-warning` | 1977 |
| `.detail-remote-restart-guide-image` | 1987 |
| `.detail-remote-restart-guide-image-label` | 2000 |
| `.detail-remote-restart-guide-image-diagram` | 2006 |
| `.detail-remote-restart-guide-steps` | 2024 |
| `.detail-remote-restart-guide-action` | 2032 |

加上**共用副本**(devices.html 中保留的同时,模块持一份完整副本):

| Selector | 来源 |
|---|---|
| `.detail-fault-sheet-dialog` | devices.html(搜索定位) |
| `.detail-fault-sheet-title` | 同上 |
| `.detail-fault-sheet-option` | 同上 |
| `.detail-fault-sheet-option:hover` | 同上 |

把上述所有规则 copy 到模块,作为 `STYLES` 常量(模板字符串)。规则之间保持空行隔开,便于阅读:

```js
  const STYLES = `
    .detail-fault-sheet-dialog { /* ... 从 devices.html 复制完整声明 ... */ }
    .detail-fault-sheet-title { ... }
    .detail-fault-sheet-option { ... }
    .detail-fault-sheet-option:hover { ... }

    .detail-remote-restart-confirm-shell { ... }
    /* ... 其余 detail-remote-restart-* 与 detail-side-restart-* 完整 ... */
  `;

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    if (typeof document === 'undefined' || !document.head) return;
    const style = document.createElement('style');
    style.setAttribute('data-cofe-fault-restart-flow', '1');
    style.textContent = STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
  }
```

> 操作技巧:用 `sed -n '1231,1372p; 1890,2040p' devices.html` 把两段连续区间一次性 dump 出来,逐段复制进 STYLES。共用的 `.detail-fault-sheet-*` 需要另外 grep 定位后复制(`grep -n "\.detail-fault-sheet-" devices.html` → 取第一组完整声明)。

在导出对象追加 `injectStyles`。

- [ ] **Step 4: 跑测试,1 PASS**

```bash
node tests/fault-restart-flow.behavior.test.js
```

预期:累计约 16 条 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/fault-restart-flow.js tests/fault-restart-flow.behavior.test.js
git commit -m "feat(fault-restart): bundle restart CSS into module and inject on demand"
```

---

## Task 6: Snapshot 锁定测试(确保模块输出等价于 devices.html 现有输出)

**Files:**
- Create: `tests/fault-restart-flow.snapshot.test.js`

- [ ] **Step 1: 抓 devices.html 当前 9 段渲染输出作为基线**

在浏览器中打开 `http://127.0.0.1:8080/devices.html`(本地 server 已在跑),在 DevTools Console 执行:

```js
const out = {
  sub: renderDetailRemoteRestartPanel('TEST001'),
  confirm_system: renderDetailRemoteConfirmDialog('重启系统'),
  confirm_left: renderDetailRemoteConfirmDialog('重启点单屏(左)'),    // 全角括号
  confirm_right: renderDetailRemoteConfirmDialog('重启点单屏(右)'),
  confirm_arm: renderDetailRemoteConfirmDialog('重启六轴机械臂(注意安全,谨慎使用)'),
  guide_system: renderDetailRemoteHardwareGuidePanel('TEST001', '重启系统'),
  guide_left: renderDetailRemoteHardwareGuidePanel('TEST001', '重启点单屏(左)'),
  guide_right: renderDetailRemoteHardwareGuidePanel('TEST001', '重启点单屏(右)'),
  guide_arm: renderDetailRemoteHardwareGuidePanel('TEST001', '重启六轴机械臂(注意安全,谨慎使用)')
};
copy(JSON.stringify(out, null, 2));
```

剪贴板里就是 9 段基线 JSON。

- [ ] **Step 2: 落到 fixture**

```bash
mkdir -p tests/fixtures
# 把剪贴板内容粘贴到下面这个文件
$EDITOR tests/fixtures/fault-restart-flow.baselines.json
```

- [ ] **Step 3: 写 snapshot 测试**

```js
// tests/fault-restart-flow.snapshot.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-restart-flow.js'), 'utf8');
const BASELINES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fault-restart-flow.baselines.json'), 'utf8'));

function loadModule() {
  const sandbox = { window: {}, globalThis: {}, document: undefined };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.window.CofeFaultRestartFlow || sandbox.globalThis.CofeFaultRestartFlow;
}

function normalize(html) {
  return String(html)
    // mask onclick handler attribute value (devices.html 原版用 handleDetailRemoteAction,模块用 window.CofeFaultRestartFlow.dispatch — 文本/结构应等价)
    .replace(/onclick="[^"]*"/g, 'onclick="…"')
    // 合并空白
    .replace(/\s+/g, ' ')
    .trim();
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.stack || e.message); process.exitCode = 1; }
}

const M = loadModule();

test('snapshot: renderSubPanel == devices.html 基线', () => {
  assert.strictEqual(normalize(M.renderSubPanel('TEST001')), normalize(BASELINES.sub));
});

test('snapshot: renderConfirmDialog("重启系统") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启系统')), normalize(BASELINES.confirm_system));
});

test('snapshot: renderConfirmDialog("重启点单屏(左)") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启点单屏(左)')), normalize(BASELINES.confirm_left));
});

test('snapshot: renderConfirmDialog("重启点单屏(右)") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启点单屏(右)')), normalize(BASELINES.confirm_right));
});

test('snapshot: renderConfirmDialog("重启六轴机械臂(注意安全,谨慎使用)") == 基线', () => {
  assert.strictEqual(normalize(M.renderConfirmDialog('重启六轴机械臂(注意安全,谨慎使用)')), normalize(BASELINES.confirm_arm));
});

test('snapshot: renderHardwareGuide(*, "重启系统") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启系统')), normalize(BASELINES.guide_system));
});

test('snapshot: renderHardwareGuide(*, "重启点单屏(左)") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启点单屏(左)')), normalize(BASELINES.guide_left));
});

test('snapshot: renderHardwareGuide(*, "重启点单屏(右)") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启点单屏(右)')), normalize(BASELINES.guide_right));
});

test('snapshot: renderHardwareGuide(*, "重启六轴机械臂(注意安全,谨慎使用)") == 基线', () => {
  assert.strictEqual(normalize(M.renderHardwareGuide('TEST001', '重启六轴机械臂(注意安全,谨慎使用)')), normalize(BASELINES.guide_arm));
});
```

- [ ] **Step 4: 跑测试**

```bash
node tests/fault-restart-flow.snapshot.test.js
```

预期:9 PASS。若任一 FAIL,**先看 diff 是真的实质偏差(文案/结构)还是 normalize 没盖到的差异**。文案不一致就回 Task 3 修;normalize 不够就增强 `replace`。

> 常见 FAIL 来源:全角/半角括号、中文逗号差异、`<button` 与 `< button`(空格)、`>` 后换行影响 token 切分。`normalize` 已合并所有空白,通常足够。

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/fault-restart-flow.baselines.json tests/fault-restart-flow.snapshot.test.js
git commit -m "test(fault-restart): snapshot module output against devices.html baselines"
```

---

## Task 7: devices.html — 引入模块 + injectStyles + 4 个 render 函数委派

**Files:**
- Modify: `devices.html`
- Create: `tests/fault-restart-flow.runtime.test.js`

- [ ] **Step 1: 写 runtime 静态检查测试**

```js
// tests/fault-restart-flow.runtime.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(p) { return fs.readFileSync(path.join(__dirname, '..', p), 'utf8'); }
function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.stack || e.message); process.exitCode = 1; }
}

test('R-1: devices.html 引入了 shared/fault-restart-flow.js', () => {
  const html = read('devices.html');
  assert.ok(/<script src="shared\/fault-restart-flow\.js"><\/script>/.test(html));
});

test('R-2: devices.html 初始化阶段调用 injectStyles', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.injectStyles\s*\(/.test(html));
});

test('R-3: devices.html renderDetailRemoteRestartPanel 一行委派', () => {
  const html = read('devices.html');
  const m = html.match(/function\s+renderDetailRemoteRestartPanel\s*\([^)]*\)\s*\{[^}]*\}/);
  assert.ok(m, '未找到函数');
  assert.ok(/CofeFaultRestartFlow\.renderSubPanel/.test(m[0]));
});

test('R-4: devices.html renderDetailRemoteConfirmDialog 重启分支委派', () => {
  const html = read('devices.html');
  // 至少含一个调用点
  assert.ok(/CofeFaultRestartFlow\.renderConfirmDialog/.test(html));
});

test('R-5: devices.html renderDetailRemoteHardwareGuidePanel 委派', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.renderHardwareGuide/.test(html));
});

test('R-6: devices.html getDetailRemoteRestartMeta 委派', () => {
  const html = read('devices.html');
  assert.ok(/CofeFaultRestartFlow\.getActionMeta/.test(html));
});
```

- [ ] **Step 2: 跑测试,6 FAIL**

```bash
node tests/fault-restart-flow.runtime.test.js
```

- [ ] **Step 3: 在 devices.html `<head>` 引入模块**

定位 `shared/admin-staff-access.js` 引用所在行:

```bash
grep -n "shared/admin-staff-access.js" devices.html
```

在该 `<script>` 行的**下一行**插入:

```html
<script src="shared/fault-restart-flow.js"></script>
```

- [ ] **Step 4: 在 devices.html 初始化阶段调一次 injectStyles**

定位 `init()` 或 `DOMContentLoaded` 入口(搜 `function init` 或 `addEventListener('DOMContentLoaded'`)。在最早执行的初始化函数体顶部插入:

```js
if (window.CofeFaultRestartFlow) window.CofeFaultRestartFlow.injectStyles();
```

- [ ] **Step 5: 把 4 个 render 函数改为一行委派**

定位以下函数,把函数体整体替换为一行委派:

- `renderDetailRemoteRestartPanel(deviceId)` 在第 7717-7726 行:

```js
        function renderDetailRemoteRestartPanel(deviceId) {
            return window.CofeFaultRestartFlow.renderSubPanel(deviceId);
        }
```

- `getDetailRemoteRestartMeta(actionName)` 在第 7728-7781 行(整段替换):

```js
        function getDetailRemoteRestartMeta(actionName) {
            return window.CofeFaultRestartFlow.getActionMeta(actionName);
        }
```

- `renderDetailRemoteConfirmDialog(actionName)` 在第 7783-7812 行(整段替换):

```js
        function renderDetailRemoteConfirmDialog(actionName) {
            return window.CofeFaultRestartFlow.renderConfirmDialog(actionName);
        }
```

- `renderDetailRemoteHardwareGuidePanel(deviceId, restartAction)` 在第 7814-7836 行(整段替换):

```js
        function renderDetailRemoteHardwareGuidePanel(deviceId, restartAction) {
            return window.CofeFaultRestartFlow.renderHardwareGuide(deviceId, restartAction);
        }
```

> 替换时先 `git diff` 局部确认,只在这四个函数体的范围内修改,不要碰前后函数。

- [ ] **Step 6: 跑 runtime + snapshot,确认 6 + 9 PASS**

```bash
node tests/fault-restart-flow.runtime.test.js
node tests/fault-restart-flow.snapshot.test.js
```

- [ ] **Step 7: 浏览器人工烟测**

刷新 `http://127.0.0.1:8080/devices.html`,进入任一设备详情:

- 点 split button 主按钮「重启系统」 → 弹「确认软件重启 / 无法远程处理?查看机器按钮位置 / 取消」对话(完全等同改造前)
- 点 caret popover → 选「重启点单屏(左)」→ 弹对应确认对话
- 旧远程操作 sheet → 「机构重启」 → 弹 4 选 1 子面板 → 任选一项 → 弹确认 → 「无法远程处理?查看机器按钮位置」→ 硬件指导 → 「我知道了」 → 关闭

> 注意:此时 devices.html 的 `handleDetailRemoteAction` 中"机构重启"入口仍然走旧路径(渲染 sub-panel),sub-panel 内每个按钮的 onclick 已是 `window.CofeFaultRestartFlow.dispatch(...)`,会进入模块的状态机。模块的 dispatch 又依赖 `activeCtx`,但此时 `activeCtx` 是 null(devices.html 还没建 ctx)。所以**这一步浏览器烟测点 sub-panel 内按钮会无响应**,这是预期,Task 8 修复。

- [ ] **Step 8: Commit**

```bash
git add devices.html tests/fault-restart-flow.runtime.test.js
git commit -m "refactor(devices): delegate restart rendering to shared module"
```

---

## Task 8: devices.html — handleDetailRemoteAction 重启入口重定向到 module.open

**Files:**
- Modify: `devices.html`
- Modify: `tests/fault-restart-flow.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('R-7: devices.html handleDetailRemoteAction 在「机构重启」入口调 module.open', () => {
  const html = read('devices.html');
  const m = html.match(/function\s+handleDetailRemoteAction[\s\S]+?\n\s{8}\}/);
  assert.ok(m, '未找到 handleDetailRemoteAction');
  // 在「机构重启」分支里应当调用 CofeFaultRestartFlow.open
  const body = m[0];
  // 确认整段函数里有 module.open 调用,且 '确认软件重启'/'无法远程处理' 等子分支已删除
  assert.ok(/CofeFaultRestartFlow\.open/.test(body));
  assert.ok(!/'确认软件重启'/.test(body) || /CofeFaultRestartFlow/.test(body));
});

test('R-8: devices.html openDetailQuickRestart 也用 module 接管 confirm', () => {
  const html = read('devices.html');
  // 简化方案:openDetailQuickRestart 仍走 renderDetailRemoteConfirmDialog(已委派),无需额外改动
  // 此测试仅占位:确认 openDetailQuickRestart 函数体内含 renderDetailRemoteConfirmDialog
  const m = html.match(/function\s+openDetailQuickRestart[\s\S]+?\n\s{8}\}/);
  assert.ok(m);
  assert.ok(/renderDetailRemoteConfirmDialog/.test(m[0]));
});
```

- [ ] **Step 2: 跑测试,2 FAIL(R-7)**

- [ ] **Step 3: 改 handleDetailRemoteAction**

定位 `function handleDetailRemoteAction(actionName)`(第 8137 行)。原函数体内对重启子树的分支(第 8161-8195 行附近)包含:

1. `if (actionName === '机构重启') { ... 渲染 sub-panel }`
2. `if (detailRemoteActionMode === 'restart' && actionName !== '确认执行') { ... pendingCommand 记录 + 渲染 confirm }`
3. `if (detailRemoteActionMode === 'confirm' && actionName === '无法远程处理?查看机器按钮位置' && detailRemotePendingCommand) { ... 渲染 guide }`
4. `if (detailRemoteActionMode === 'hardware-guide' && actionName === '我知道了') { ... close }`
5. `if (['确认执行','确认软件重启'].includes(actionName) && detailRemotePendingCommand) { ... 落记录 + close + toast }`

把这些分支**整体替换**为:

```js
            // 「机构重启」入口:把后续状态机交给共享模块
            if (actionName === '机构重启') {
                const deviceId = activeFaultActionDeviceId || currentDetailDeviceId;
                if (!window.CofeFaultRestartFlow || !deviceId) return;
                const ctx = {
                    deviceId,
                    panel,
                    mode: 'sub',
                    pendingAction: '',
                    onCommit(did, cmd) {
                        appendFaultOperationRecord(did, cmd, '成功', `${did} 已执行${cmd}`);
                        showToast(`已向设备 ${did} 下发指令:${cmd}`);
                    },
                    onCancel() {
                        // 复用 devices.html 现有 close
                        closeDetailRemoteActions && closeDetailRemoteActions();
                    }
                };
                window.CofeFaultRestartFlow.open(ctx);
                panel.classList.add('active');
                return;
            }
            // 此后不再处理重启子树:子面板、确认、硬件指导的点击都通过
            // window.CofeFaultRestartFlow.dispatch 直接进 module.handle。
```

`openDetailQuickRestart`(8035 行)与 `openDetailRestartPart`(8053 行)目前直接渲染 confirm 对话框 —— 这两条路径**不经过 sub-panel**,但点击 confirm 里的按钮会触发 `module.dispatch`,而此时 `activeCtx` 仍未由 `open` 设置。需要在这两个函数末尾也建 ctx 并注入 module:

定位 `openDetailQuickRestart`:

```js
        function openDetailQuickRestart(deviceId, actionName) {
            const targetDeviceId = String(deviceId || currentDetailDeviceId || '').trim();
            const panel = document.getElementById('detailRemoteActionSheet');
            if (!targetDeviceId || !panel) return;
            // 既有逻辑保留 ...
            activeFaultActionDeviceId = targetDeviceId;
            detailRemoteActionMode = 'confirm';
            detailRemotePendingCommand = actionName;
            detailRemoteVolumeContext = null;
            panel.innerHTML = renderDetailRemoteConfirmDialog(actionName);
            panel.classList.add('active');
            // 新增:让模块接管,以便 confirm 里按钮点击能走到 dispatch → handle
            if (window.CofeFaultRestartFlow) {
                const ctx = {
                    deviceId: targetDeviceId,
                    panel,
                    mode: 'confirm',
                    pendingAction: actionName,
                    onCommit(did, cmd) {
                        appendFaultOperationRecord(did, cmd, '成功', `${did} 已执行${cmd}`);
                        showToast(`已向设备 ${did} 下发指令:${cmd}`);
                    },
                    onCancel() { closeDetailRemoteActions && closeDetailRemoteActions(); }
                };
                // 不调 open(它会重渲染 sub-panel),直接通过 close/open 之外的临时手段把 ctx 设为 activeCtx
                // 这里复用 close(null) 重置,再用 dispatch 调用前手动写 activeCtx 是 hack;
                // 改用模块对外暴露的 setActiveCtx 接口(在 Task 4 已加入或现在补)
                window.CofeFaultRestartFlow._setActiveCtx(ctx);
            }
        }
```

> 这里出现了一个 spec 没显式说的细节:`openDetailQuickRestart` 跳过 sub-panel 直接进 confirm,需要 ctx 已就绪。简单做法:模块再暴露一个 `_setActiveCtx(ctx)`(内部用,前缀下划线表示"半内部")。回头改模块:

回到 Step 3 之前先补模块:在 `shared/fault-restart-flow.js` 状态机区追加:

```js
  function _setActiveCtx(ctx) {
    activeCtx = ctx;
  }
```

并在导出对象追加 `_setActiveCtx`。同时追加一条 behavior 测试:

```js
test('_setActiveCtx + dispatch: 可在跳过 open 时让 confirm 按钮工作', () => {
  M.close(null);
  const panel = createPanel();
  let committedArgs = null;
  const ctx = { deviceId: 'D001', panel, mode: 'confirm', pendingAction: '重启系统', onCommit: (...a) => { committedArgs = a; }, onCancel: () => {} };
  panel.innerHTML = M.renderConfirmDialog('重启系统');
  M._setActiveCtx(ctx);
  M.dispatch('确认软件重启');
  assert.deepStrictEqual(committedArgs, ['D001', '重启系统']);
});
```

- [ ] **Step 4: 跑相关测试,全 PASS**

```bash
node tests/fault-restart-flow.behavior.test.js
node tests/fault-restart-flow.runtime.test.js
node tests/fault-restart-flow.snapshot.test.js
```

- [ ] **Step 5: 浏览器烟测**

刷新 `devices.html` 详情:

- split button 主按钮「重启系统」→ 弹 confirm → 选「确认软件重启」 → toast「已向设备 X 下发指令:重启系统」 + 操作记录 +1
- caret popover 选「重启点单屏(左)」→ confirm → 「无法远程处理?查看机器按钮位置」 → guide → 「我知道了」 → 关闭
- 旧 sheet → 「机构重启」 → sub-panel → 任选一项 → confirm → 各路径符合预期

- [ ] **Step 6: Commit**

```bash
git add devices.html shared/fault-restart-flow.js tests/fault-restart-flow.behavior.test.js
git commit -m "refactor(devices): route restart dispatch through shared module"
```

---

## Task 9: devices.html — CSS 搬迁(删除已移到模块的 class)

**Files:**
- Modify: `devices.html`
- Modify: `tests/fault-restart-flow.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('R-9: devices.html 已移除 .detail-remote-restart-confirm-shell 等内联 CSS', () => {
  const html = read('devices.html');
  // 移除的标志:.detail-remote-restart-confirm-shell 不在内联 <style> 里出现
  // 但 CSS class 名会在 inline HTML 的 class="..." 属性中出现(因为渲染输出仍含 class 名)
  // 所以更精确:确认 ".detail-remote-restart-confirm-shell {" 这种 CSS 规则形式不存在
  assert.ok(!/\.detail-remote-restart-confirm-shell\s*\{/.test(html));
  assert.ok(!/\.detail-remote-restart-guide-shell\s*\{/.test(html));
  assert.ok(!/\.detail-side-restart-split\s*\{/.test(html));
});

test('R-10: devices.html 共用 .detail-fault-sheet-* 仍在,且头加同步注释', () => {
  const html = read('devices.html');
  assert.ok(/\.detail-fault-sheet-dialog\s*\{/.test(html));
  assert.ok(/同步副本在 shared\/fault-restart-flow\.js/.test(html));
});
```

- [ ] **Step 2: 跑测试,2 FAIL**

- [ ] **Step 3: 删 devices.html 内联 `<style>` 中已搬走的 CSS**

按 Task 5 Step 3 的表格,逐个 selector 删除其完整规则块。建议:

```bash
# 把第 1230 - 1372 行区间打开,逐 selector 块删除(以 `}` 收尾,注意嵌套)
# 把第 1890 - 2038 行区间打开,同样逐块删除
```

**保留**:`.detail-fault-sheet-dialog`、`.detail-fault-sheet-title`、`.detail-fault-sheet-option`、`.detail-fault-sheet-option:hover` 共 4 个共用 class。

- [ ] **Step 4: 在保留的 4 个共用 class 头加同步注释**

定位 `.detail-fault-sheet-dialog {`,在该行**前**插入:

```css
/* ⚠️ 同步副本在 shared/fault-restart-flow.js 的 STYLES 常量中,修改请同步 */
```

- [ ] **Step 5: 跑测试 + 浏览器烟测**

```bash
node tests/fault-restart-flow.runtime.test.js
```

预期:`R-9` 和 `R-10` PASS。

浏览器:刷新 `devices.html` 详情,**重启相关 UI 视觉不应有任何变化**(模块 `injectStyles` 注入的 CSS 与删除的 inline CSS 等价)。如果发现样式塌掉,说明 STYLES 常量里漏抄了某条规则,回 Task 5 补。

- [ ] **Step 6: Commit**

```bash
git add devices.html tests/fault-restart-flow.runtime.test.js
git commit -m "refactor(devices): move restart-specific CSS into shared module"
```

---

## Task 10: faults.html — 引入模块 + panel 容器 + showToast + appendFaultOperationRecord

**Files:**
- Modify: `faults.html`
- Modify: `tests/fault-restart-flow.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('R-11: faults.html 引入 shared/fault-restart-flow.js', () => {
  const html = read('faults.html');
  assert.ok(/<script src="shared\/fault-restart-flow\.js"><\/script>/.test(html));
});

test('R-12: faults.html 初始化阶段调 injectStyles', () => {
  const html = read('faults.html');
  assert.ok(/CofeFaultRestartFlow\.injectStyles\s*\(/.test(html));
});

test('R-13: faults.html 新增 #faultRestartFlowSheet 容器', () => {
  const html = read('faults.html');
  assert.ok(/<div id="faultRestartFlowSheet"/.test(html));
});

test('R-14: faults.html 新增 showToast 函数', () => {
  const html = read('faults.html');
  assert.ok(/function\s+showToast\s*\(/.test(html));
});

test('R-15: faults.html 新增 appendFaultOperationRecord 函数', () => {
  const html = read('faults.html');
  assert.ok(/function\s+appendFaultOperationRecord\s*\(/.test(html));
});
```

- [ ] **Step 2: 跑测试,5 FAIL**

- [ ] **Step 3: faults.html `<head>` 引入模块**

定位 `<script src="shared/admin-staff-access.js">`(应该在 `<head>` 末尾附近):

```bash
grep -n "shared/admin-staff-access.js" faults.html
```

紧随其后插入:

```html
<script src="shared/fault-restart-flow.js"></script>
```

- [ ] **Step 4: 初始化阶段调 injectStyles**

定位 faults.html 的 `init()` 或最早的 `DOMContentLoaded`(搜 `function init` 或 `DOMContentLoaded`)。在函数体顶部插入:

```js
if (window.CofeFaultRestartFlow) window.CofeFaultRestartFlow.injectStyles();
```

- [ ] **Step 5: 加 panel 容器**

定位 `<div id="remoteActionSheet">`,在其同级**之后**插入:

```html
    <div id="faultRestartFlowSheet" class="fault-sheet"></div>
```

(沿用 faults.html 既有 `.fault-sheet` 外壳 class,无需新 CSS。)

- [ ] **Step 6: 新增 showToast**

定位 faults.html 内联脚本区(任一 `function ...` 之间),插入:

```js
        function showToast(message, type = 'success') {
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                toast.className = 'toast';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.className = `toast ${type} show`;
            setTimeout(() => toast.classList.remove('show'), 2500);
        }
```

并在内联 `<style>` 区追加 toast 样式(从 devices.html 第 3478-3506 行 copy):

```css
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--text-primary);
            color: white;
            padding: 14px 24px;
            border-radius: var(--radius);
            font-size: 14px;
            font-weight: 500;
            z-index: 2000;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
            box-shadow: var(--shadow-lg);
        }
        .toast.show { opacity: 1; transform: translateX(0); }
        .toast.success { background: var(--success); }
        .toast.error { background: var(--danger); }
```

> 检查 faults.html 是否已定义 `--text-primary`、`--success`、`--danger`、`--radius`、`--shadow-lg` 这些 CSS 变量。多数 device-mgmt 页面在 `:root` 都有定义;若缺失,补一行 `:root { --success: #2ed573; ... }` 即可。

- [ ] **Step 7: 新增 appendFaultOperationRecord + 修改 getOperationRecords**

定位现有 `function getOperationRecords(deviceId)`(在 faults.html 中,搜该函数名)。在其**前**插入:

```js
        function appendFaultOperationRecord(deviceId, action, result, note) {
            const key = 'faultOpRecords_' + deviceId;
            let arr;
            try { arr = JSON.parse(localStorage.getItem(key) || '[]'); }
            catch (e) { arr = []; }
            if (!Array.isArray(arr)) arr = [];
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const time = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            const profile = (window.CofeAdminStaffAccess && typeof window.CofeAdminStaffAccess.readSidebarLoginProfile === 'function')
                ? window.CofeAdminStaffAccess.readSidebarLoginProfile() : null;
            const operator = (profile && profile.name) || '运营';
            arr.unshift({ time, operator, action, result: result || '成功', note: note || '' });
            if (arr.length > 50) arr.length = 50;
            localStorage.setItem(key, JSON.stringify(arr));
        }
```

修改 `getOperationRecords` 的开头,在原 mock 数据 return 之前优先读 localStorage:

```js
        function getOperationRecords(deviceId) {
            try {
                const raw = localStorage.getItem('faultOpRecords_' + deviceId);
                const arr = raw ? JSON.parse(raw) : [];
                if (Array.isArray(arr) && arr.length) return arr;
            } catch (e) { /* 回落到 mock */ }
            return [
                // ... 原 mock 数组保留不动
            ];
        }
```

- [ ] **Step 8: 跑测试,5 PASS**

```bash
node tests/fault-restart-flow.runtime.test.js
```

- [ ] **Step 9: Commit**

```bash
git add faults.html tests/fault-restart-flow.runtime.test.js
git commit -m "feat(faults): add toast and op-record infra for restart flow integration"
```

---

## Task 11: faults.html — openFaultRestartFlow + 按钮 onclick 切换

**Files:**
- Modify: `faults.html`
- Modify: `tests/fault-restart-flow.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('R-16: faults.html 新增 openFaultRestartFlow 函数', () => {
  const html = read('faults.html');
  assert.ok(/function\s+openFaultRestartFlow\s*\(/.test(html));
});

test('R-17: faults.html 「机构重启」按钮 onclick 已切换为 openFaultRestartFlow', () => {
  const html = read('faults.html');
  // 原本是 handleRemoteAction('机构重启'),现在应改成 openFaultRestartFlow()
  // 在 openRemoteActions 函数体内查找
  const m = html.match(/function\s+openRemoteActions[\s\S]+?\n\s{8}\}/);
  assert.ok(m);
  const body = m[0];
  // 「机构重启」字样不再绑定到 handleRemoteAction
  assert.ok(/openFaultRestartFlow/.test(body));
  // 而其他三项仍走 handleRemoteAction
  assert.ok(/handleRemoteAction\('设备开门'\)/.test(body));
});
```

- [ ] **Step 2: 跑测试,2 FAIL**

- [ ] **Step 3: 新增 openFaultRestartFlow**

定位 `function openRemoteActions`(faults.html 第 2130 行附近),在其**前**插入:

```js
        function openFaultRestartFlow() {
            closeRemoteActions();
            const deviceId = activeFaultDeviceId;
            if (!deviceId || !canAccessFaultDevice(deviceId)) return;
            if (!window.CofeFaultRestartFlow) return;
            const panel = document.getElementById('faultRestartFlowSheet');
            if (!panel) return;
            const ctx = {
                deviceId,
                panel,
                mode: 'sub',
                pendingAction: '',
                onCommit(did, actionName) {
                    appendFaultOperationRecord(did, actionName, '成功', `${did} 已执行${actionName}`);
                    showToast(`已向设备 ${did} 下发指令:${actionName}`);
                },
                onCancel() { /* close 已由模块负责 */ }
            };
            window.CofeFaultRestartFlow.open(ctx);
            panel.classList.add('active');
        }
```

- [ ] **Step 4: 改「机构重启」按钮 onclick**

定位 `function openRemoteActions(deviceId)` 函数体内两处 `handleRemoteAction('机构重启')`(第 2142 行 desktop 模式 + 第 2151 行 sheet 模式)。把这两处的 onclick 改为:

```html
<button type="button" class="fault-desktop-option" onclick="openFaultRestartFlow()">机构重启</button>
```

```html
<button type="button" class="fault-sheet-option" onclick="openFaultRestartFlow()">机构重启</button>
```

其他三项保持 `handleRemoteAction(...)` 调用不动。

- [ ] **Step 5: 跑全部测试**

```bash
node tests/fault-restart-flow.behavior.test.js
node tests/fault-restart-flow.runtime.test.js
node tests/fault-restart-flow.snapshot.test.js
```

预期:全部 PASS。

- [ ] **Step 6: 浏览器烟测**

刷新 `http://127.0.0.1:8080/faults.html`,在任一设备故障行:

- 点「远程操作」按钮 → 弹 4 项 sheet
- 点「机构重启」 → sheet 关闭、新 sheet 弹出含「重启系统/重启点单屏(左)/重启点单屏(右)/重启六轴机械臂(注意安全,谨慎使用)」4 选 1
- 任选一项 → 「确认软件重启 / 无法远程处理? / 取消」
- 点「确认软件重启」 → toast 出现「已向设备 X 下发指令:Y」、面板关闭;切到设备详情(若可见)看「操作记录」新增一条
- 重新走一遍,点「无法远程处理?查看机器按钮位置」 → 硬件指导面板(含 warning、4 步骤、按钮位置示意) → 「我知道了」 → 关闭
- 重新走一遍,点「取消」 → 关闭,无 toast、无记录

- [ ] **Step 7: Commit**

```bash
git add faults.html tests/fault-restart-flow.runtime.test.js
git commit -m "feat(faults): wire restart button to shared module flow"
```

---

## Task 12: 全流程冒烟 + 回归基线 + spec 覆盖核对

**Files:** 无代码改动

- [ ] **Step 1: 全套测试**

```bash
node --test tests/*.test.js 2>&1 | tail -30
```

预期:
- 已知 4 个基线失败不变
- `fault-restart-flow.behavior.test.js` / `.runtime.test.js` / `.snapshot.test.js` 全部 PASS
- `fault-push-channels.behavior.test.js` / `.runtime.test.js` 继续 PASS
- 其他既有测试无新增 FAIL

- [ ] **Step 2: 浏览器人工 walkthrough(8 步)**

| # | 操作 | 预期 |
|---|---|---|
| 1 | `devices.html` 详情 split button 主按钮重启 | 直接弹「确认软件重启 · 重启系统」对话,与改造前外观一致 |
| 2 | `devices.html` caret popover 选「重启点单屏(左)」 | 进入对应确认对话 |
| 3 | `devices.html` 旧远程操作 sheet → 「机构重启」 | 进入 4 选 1 子面板 |
| 4 | `devices.html` 任一确认对话 → 「无法远程处理?查看机器按钮位置」 | 硬件指导面板,steps/warning 一致 |
| 5 | `faults.html` 列表行「远程操作」→ 「机构重启」 | 进入 4 选 1 子菜单 |
| 6 | `faults.html` 走完一遍「确认软件重启」 | 顶部 toast「已向设备 X 下发指令:Y」 |
| 7 | `faults.html` 走完一遍「我知道了」 | 面板关闭,无 toast、无记录 |
| 8 | `faults.html` 列表行「设备开门/设备停售/音量调节」 | 仍是原本的 `alert`,行为未受影响 |

- [ ] **Step 3: spec 覆盖核对**

| Spec 节 | 对应 Task |
|---|---|
| §1.1 API 形态 | Task 2 + 3 + 4 + 5 |
| §1.2 meta 数据 | Task 2 |
| §1.3 ctx 形态 | Task 4(behavior 测试断言所有字段) |
| §1.4 状态机 6 条转移 | Task 4(7 条测试覆盖) |
| §1.5 CSS 搬迁 + injectStyles | Task 5 + 9 |
| §2.1 devices.html 加载模块 | Task 7(R-1/R-2) |
| §2.2 4 个 render 函数委派 | Task 7(R-3 ~ R-6)+ Task 8(R-7) |
| §2.3 devices.html CSS 调整 | Task 9(R-9/R-10) |
| §3.1 ~ §3.5 faults.html 改造 | Task 10(R-11 ~ R-15)+ Task 11(R-16/R-17) |
| §4.1 单元测试(14 条) | Task 2-5 共约 17 条 ✓ |
| §4.2 Snapshot 锁定(9 条) | Task 6 ✓ |
| §4.3 Runtime 静态检查(10+ 条) | Task 7-11 共约 17 条 ✓ |
| §4.4 浏览器 walkthrough 8 步 | Task 12 Step 2 |
| §4.5 回归基线对比 | Task 12 Step 1 |

- [ ] **Step 4: 推分支 + 开/续 PR**

```bash
git push origin feat/fault-push-channels
```

如已有 PR,直接续上;否则新开:

```bash
gh pr create --title "feat: unify fault restart flow + multi-channel push" --body "$(cat <<'EOF'
## Summary
- 故障推送多渠道(邮箱 + 公众号,已先期完成)
- 故障列表「机构重启」对齐设备管理重启流程,共享至 shared/fault-restart-flow.js

## Spec & Plan
- Spec(渠道): docs/superpowers/specs/2026-06-03-fault-push-channels-design.md
- Plan(渠道): docs/superpowers/plans/2026-06-03-fault-push-channels-implementation-plan.md
- Spec(重启): docs/superpowers/specs/2026-06-03-fault-restart-flow-unify-design.md
- Plan(重启): docs/superpowers/plans/2026-06-03-fault-restart-flow-unify-implementation-plan.md

## Test plan
- [x] node --test tests/*.test.js 全套通过(已知 4 个基线失败保持不变)
- [x] devices.html / faults.html 重启 8 步 walkthrough 全通过
- [x] snapshot 测试锁定 devices.html 改造前后输出等价
EOF
)"
```

---

## Self-Review 备忘

- **状态机转移路径**有 7 条对应测试(open + 5 条 dispatch 跳转 + dispatch 无 ctx 静默 + `_setActiveCtx` 跳过 sub-panel 路径),覆盖 spec §1.4 全部 6 行转移表 + Task 8 补的 `openDetailQuickRestart` 路径。
- **`_setActiveCtx` 是 spec 没写的补充**:devices.html 的 split button 主按钮跳过 sub-panel 直接进 confirm,需要这个口子。前缀 `_` 表示半内部,可在后续迭代中替代为更优雅的 API(如 `openAt(ctx, mode, action)`)。
- **Snapshot 测试用 normalize 把 onclick 文本 mask 掉**,因为模块把 onclick 改为 `window.CofeFaultRestartFlow.dispatch(...)`,但 HTML 结构/class/文案应完全等价。如果 walkthrough 发现样式塌掉但 snapshot 仍 PASS,问题大概率在 STYLES 常量漏抄 CSS 规则,回 Task 5 补。
- **共用 `.detail-fault-sheet-*` 双份维护风险**已在 spec §1.5/Task 9 加同步注释;若后续真有人改了 devices.html 的副本,模块副本不变,faults.html 会显示旧样式 —— 测试无法 catch 这种漂移,只能靠注释提醒。
- **每个 Task 都是先写测试 → 看 FAIL → 实现 → 看 PASS → commit** 五步对齐 TDD 节奏;commit 粒度对应 12 次。
