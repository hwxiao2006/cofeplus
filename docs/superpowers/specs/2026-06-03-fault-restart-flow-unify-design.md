# 故障处理与设备管理「重启」流程统一

- **日期**: 2026-06-03
- **模块**: device-mgmt · `faults.html`、`devices.html`、新增 `shared/fault-restart-flow.js`
- **基线**: worktree `feat/fault-push-channels` @ `51df653`（接续 fault-push-channels 之后）
- **分支建议**: 在同一分支继续提交,或新开 `feat/fault-restart-flow-unify` 后 PR 时合并

## 背景

`faults.html` 列表行的「远程操作」sheet 里有 4 项,其中「机构重启」的实际行为是 `alert('已向设备 X 下发指令:机构重启')` —— 一句吐司都算不上,没有确认、没有部件选择、没有硬件指导、没有运维记录。

`devices.html` 设备详情侧栏的「重启」是另一套完整流程:split button 主按钮直接进「重启系统」确认对话,旁边的 caret popover 列出部件级重启项;选完任意动作后弹「确认软件重启 / 无法远程处理?查看机器按钮位置 / 取消」对话,选「无法远程处理」会进入分步骤的硬件指导面板;成功执行后写 `appendFaultOperationRecord` 落运维记录并 `showToast`。

两边明显不一致。本期把 `faults.html` 的「机构重启」对齐到 `devices.html` 已有的完整流程,顺手把这套流程抽到共享模块,避免下次再次漂移。

## 目标

- `faults.html` 点击「机构重启」后,获得与 `devices.html` 完全相同的体验:子菜单 → 确认对话 → 硬件指导(可选) → 成功落运维记录 + toast。
- 这套流程由单一来源 `shared/fault-restart-flow.js` 提供 HTML 渲染、状态机与 CSS;`devices.html` 与 `faults.html` 都是消费者。
- 改造之后,以后再改重启文案/步骤/样式,只在共享模块改一处,两边自动同步。

## 不在范围

- `faults.html`「远程操作」sheet 里其他 3 项(设备开门 / 设备停售 / 音量调节)继续保持现有 `alert` 行为,不动。
- `devices.html` 重启之外的远程操作路径(音量调节、状态编辑等)继续走原状态机,不进共享模块。
- 真实重启指令下发的后端对接(仍是原型态)。
- split button 形态的 UI 不带到 `faults.html`(列表行不适合 split button,入口仍是 sheet 里的一个按钮)。

## 名词约定

- **重启动作**:本期支持的 4 项,文案与 `devices.html` 当前一致 —— `重启系统` / `重启点单屏(左)` / `重启点单屏(右)` / `重启六轴机械臂(注意安全,谨慎使用)`。
- **共享模块**:`shared/fault-restart-flow.js`,IIFE 暴露 `window.CofeFaultRestartFlow`,与既有 `shared/admin-staff-access.js` 风格一致。
- **消费侧**:调用共享模块的页面,本期是 `devices.html` 与 `faults.html`。
- **ctx**:消费侧持有的状态对象,字段见 §1.3。
- **运维记录**:`devices.html` 已有 `appendFaultOperationRecord(deviceId, action, result, note)` 写入 mock + localStorage;`faults.html` 此前用 mock `getOperationRecords(deviceId)` 返回静态数据,本期补一对写入/读取函数。

## 设计

### 1. 共享模块:`shared/fault-restart-flow.js`

#### 1.1 对外 API

```js
window.CofeFaultRestartFlow = {
    ACTIONS,                                      // string[]
    getActionMeta(actionName),                    // → meta | null
    renderSubPanel(deviceId),                     // → HTML 字符串
    renderConfirmDialog(actionName),              // → HTML 字符串
    renderHardwareGuide(deviceId, actionName),    // → HTML 字符串
    open(ctx),                                    // 进入 sub 态
    handle(ctx, actionName),                      // 状态机推进
    close(ctx),                                   // 关闭 panel
    injectStyles()                                // 一次性注入 CSS,幂等
};
```

`ACTIONS` 顺序固定为:`['重启系统', '重启点单屏(左)', '重启点单屏(右)', '重启六轴机械臂(注意安全,谨慎使用)']`,与 `devices.html` 现有顺序一致。

#### 1.2 `getActionMeta` 数据结构

每个动作对应一份 meta:

```js
{
    guideTitle: '机器按钮位置 · 重启系统',
    imageLabel: '整机重启按钮位置示意图',
    imageHint: '请客户查看设备机身侧面或背部控制区域……',
    steps: ['请先确认设备周边无人……', '在设备机身侧面或背部……', '按住按钮约 3 秒……', '等待设备恢复后……'],
    warning: '该操作需要客户在设备现场完成,系统无法远程执行。'  // 「重启六轴机械臂」的 warning 不同
}
```

文案与 `devices.html` 现有 `getDetailRemoteRestartMeta` 完全一致;迁移期间用 §4 的 snapshot 测试锁定等价。

#### 1.3 ctx 形态(消费侧持有)

```js
const ctx = {
    deviceId,                                  // 当前操作的设备
    panel,                                     // <div> DOM 容器,消费侧已准备好
    mode: 'sub',                               // 'sub' | 'confirm' | 'hardware-guide'(模块写)
    pendingAction: '',                         // 当前选中的具体动作(模块写)
    onCommit(deviceId, actionName),            // 用户点「确认软件重启」时调用
    onCancel()                                 // 用户点「取消」/「我知道了」时调用
};
```

模块负责写 `mode` 和 `pendingAction`、切换 `panel.innerHTML`;**不**直接动 `panel.classList`(由消费侧决定何时显示/隐藏)、**不**碰业务数据(操作记录、toast 通过 `onCommit` 委托给消费侧)。

#### 1.4 状态机推进

| 入口 / 当前 mode | 调用 | 跳转后 mode | 模块动作 |
|---|---|---|---|
| 任意 | `open(ctx)` | `sub` | `panel.innerHTML = renderSubPanel(ctx.deviceId)` |
| `sub` | `handle(ctx, X)`,`X ∈ ACTIONS` | `confirm` | 记 `pendingAction=X`,`panel.innerHTML = renderConfirmDialog(X)` |
| `confirm` | `handle(ctx, '确认软件重启')` | (close) | 调 `onCommit(deviceId, pendingAction)`,然后 `close(ctx)` |
| `confirm` | `handle(ctx, '无法远程处理?查看机器按钮位置')` | `hardware-guide` | `panel.innerHTML = renderHardwareGuide(deviceId, pendingAction)` |
| `confirm` | `handle(ctx, '取消')` | (close) | 调 `onCancel()`,然后 `close(ctx)` |
| `hardware-guide` | `handle(ctx, '我知道了')` | (close) | 调 `onCancel()`,然后 `close(ctx)` |

`close(ctx)`:`panel.classList.remove('active')`、`panel.innerHTML = ''`、清 `mode`/`pendingAction`。

模块只承认上面 6 种 (mode × actionName) 组合;其他组合静默忽略,避免与 `devices.html` 状态机外壳的非重启分支干扰。

#### 1.5 `injectStyles` 与 CSS 搬迁

从 `devices.html` 把以下两组 CSS 移入模块 `STYLES` 常量:

- **重启专属(完整搬走)**:`.detail-remote-restart-confirm-shell`、`.detail-remote-restart-confirm-primary`、`.detail-remote-restart-confirm-helper`、`.detail-remote-restart-confirm-callout`、`.detail-remote-restart-confirm-arrow`、`.detail-remote-restart-confirm-cancel`、`.detail-remote-restart-guide-shell`、`.detail-remote-restart-guide-card`、`.detail-remote-restart-guide-warning`、`.detail-remote-restart-guide-image`、`.detail-remote-restart-guide-image-label`、`.detail-remote-restart-guide-image-diagram`、`.detail-remote-restart-guide-steps`、`.detail-remote-restart-guide-action`、`.detail-side-restart-*` 系列。
- **共用(复制副本进模块,源在 `devices.html` 保留)**:`.detail-fault-sheet-dialog`、`.detail-fault-sheet-title`、`.detail-fault-sheet-option` —— 这些 class 在 `devices.html` 的「编辑状态」「音量调节」等面板也会用到,不能从 `devices.html` 删除;模块持一份完全相同的副本,以便 `faults.html` 注入后渲染等同效果。

`injectStyles` 实现:

```js
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

幂等,允许两个页面各调一次。

**漂移防护**:在 `devices.html` 保留的 `.detail-fault-sheet-dialog/.detail-fault-sheet-title/.detail-fault-sheet-option` 三处 CSS 上方加注释:

```css
/* ⚠️ 同步副本在 shared/fault-restart-flow.js 的 STYLES 常量中,修改请同步 */
```

### 2. `devices.html` 改造

#### 2.1 加载共享模块

`<head>` 区(或 `<script src="shared/admin-staff-access.js">` 之后)新增:

```html
<script src="shared/fault-restart-flow.js"></script>
```

页面初始化阶段(`DOMContentLoaded` 或 `init()`)新增:

```js
if (window.CofeFaultRestartFlow) window.CofeFaultRestartFlow.injectStyles();
```

#### 2.2 四个 render 函数改为一行委派,状态机外壳不动

`devices.html` 现有的:

| 原函数(行号参考) | 改造后 |
|---|---|
| `renderDetailRemoteRestartPanel(deviceId)` ~7717 | `return window.CofeFaultRestartFlow.renderSubPanel(deviceId);` |
| `renderDetailRemoteConfirmDialog(actionName)` 命中 restart meta 的 `if` 分支 ~7783 | 该分支返回 `window.CofeFaultRestartFlow.renderConfirmDialog(actionName);`;非 restart 分支(`return` 后面那段)保持不变 |
| `renderDetailRemoteHardwareGuidePanel(deviceId, restartAction)` ~7814 | `return window.CofeFaultRestartFlow.renderHardwareGuide(deviceId, restartAction);` |
| `getDetailRemoteRestartMeta(actionName)` ~7728 | `return window.CofeFaultRestartFlow.getActionMeta(actionName);` |
| `handleDetailRemoteAction` 的重启相关分支 ~8161-8195 | **不动** —— 这些分支内部调用上面四个函数,委派后即等价 |

保留函数名,避免改动现有 5+ 处调用点(`openDetailQuickRestart` / `openDetailRestartSystem` / `openDetailRestartPart` / 旧 sheet 入口 / split button HTML 的 onclick)。

#### 2.3 CSS 调整

把 §1.5 列出的「重启专属」class 整段从内联 `<style>` 中删除。共用的 `.detail-fault-sheet-*` 保留,头上加同步注释。

### 3. `faults.html` 改造

#### 3.1 加载共享模块

同 §2.1,引入 `<script src="shared/fault-restart-flow.js"></script>` 并在 `DOMContentLoaded` 调 `injectStyles()`。

#### 3.2 新增 panel 容器

在 `<body>` 底部、`#remoteActionSheet` 同级,加:

```html
<div id="faultRestartFlowSheet" class="fault-sheet"></div>
```

`fault-sheet` 是 `faults.html` 已有的外壳 class(.active 时显示)。共享模块只负责往里写 innerHTML,不碰这个外壳样式。

#### 3.3 修改「机构重启」按钮 onclick

`openRemoteActions` 函数里两处生成 sheet HTML 的位置,把:

```html
<button … onclick="handleRemoteAction('机构重启')">机构重启</button>
```

改为:

```html
<button … onclick="openFaultRestartFlow()">机构重启</button>
```

`handleRemoteAction` 函数不删,其他 3 个动作仍走这条路径。

#### 3.4 新增入口函数 `openFaultRestartFlow`

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

#### 3.5 新增 `showToast` 与 `appendFaultOperationRecord`

`showToast`:从 `devices.html` 抄一份最小实现(约 30 行 JS + 一段 CSS),放在 `faults.html` 内联脚本/样式区。后续如有需要可以再抽 shared,本期 YAGNI。

`appendFaultOperationRecord(deviceId, action, result, note)`:

```js
function appendFaultOperationRecord(deviceId, action, result, note) {
    const key = 'faultOpRecords_' + deviceId;
    let arr;
    try { arr = JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.unshift({
        time: formatNowDateTime(),
        operator: (window.CofeAdminStaffAccess?.readSidebarLoginProfile?.()?.name) || '运营',
        action,
        result,
        note
    });
    if (arr.length > 50) arr.length = 50;
    localStorage.setItem(key, JSON.stringify(arr));
}
```

`getOperationRecords(deviceId)` 改为:先读 localStorage,空则返回原 mock。

`formatNowDateTime` 是简单的 `YYYY-MM-DD HH:mm:ss`,faults.html 自行定义(或复用同名 util,如已存在)。

### 4. 测试

新增三个测试文件,共约 33 条用例。

#### 4.1 单元测试 — `tests/fault-restart-flow.behavior.test.js`(约 14 条)

加载模块到 VM,断言纯函数与状态机:

- `ACTIONS` 数组顺序固定
- `getActionMeta` 四个动作各返回 4 步 + warning;`重启六轴机械臂` 的 warning 含「机械臂周边安全」;未知动作 → `null`
- `renderSubPanel`:含 4 个 onclick;deviceId 注入时正确 escape
- `renderConfirmDialog`:含「确认软件重启」「无法远程处理?查看机器按钮位置」「取消」三段文案
- `renderHardwareGuide`:含 warning + 4 个 `<li>` 步骤(用 DOMParser 或正则计数)
- 状态机 6 条转移路径各 1 条断言:`open` 进 sub、sub→confirm 含 pendingAction、confirm→commit 调 onCommit、confirm→guide、confirm→cancel 调 onCancel、guide→close 调 onCancel
- `injectStyles` 注入一个带 `data-cofe-fault-restart-flow` 的 `<style>`;再次调用不重复注入

#### 4.2 Snapshot 锁定 — `tests/fault-restart-flow.snapshot.test.js`(9 条)

在 Task 1 中先把 `devices.html` 改造前的渲染输出抓出来作为基线字符串硬编码到测试文件:

- 改造**前**捕获:对 4 个动作,各跑一次 `renderDetailRemoteRestartPanel('TEST001')` / `renderDetailRemoteConfirmDialog(actionName)` / `renderDetailRemoteHardwareGuidePanel('TEST001', actionName)`,共 1 + 4 + 4 = 9 段 HTML
- 改造**后**:加载共享模块跑同名渲染函数,与基线 normalize(去前后空白、合并连续空白)后字符串相等

确保委派后输出逐字段一致。

#### 4.3 Runtime 静态检查 — `tests/fault-restart-flow.runtime.test.js`(10 条)

- R-1/R-2/R-3:`devices.html` / `faults.html` 都在 `<head>` 引入 `shared/fault-restart-flow.js`(R-3 同时校验 injectStyles 被调用)
- R-4 ~ R-7:`devices.html` 四个函数改为一行委派(grep 函数体含 `CofeFaultRestartFlow.renderSubPanel` 等)
- R-8:`faults.html` 新增 `openFaultRestartFlow` 函数 + `<div id="faultRestartFlowSheet"`
- R-9:`faults.html`「机构重启」按钮 onclick 已切换为 `openFaultRestartFlow()`(grep `openRemoteActions` 函数体)
- R-10:`faults.html` 新增 `appendFaultOperationRecord` 与 `showToast`
- R-11:`devices.html` 内联 `<style>` 中已移除 `detail-remote-restart-*` 系列(grep 应缺席),但 `.detail-fault-sheet-*` 仍在

> 编号 R-1 ~ R-11 仅作分类编号,实际测试条数以 case 数为准。

#### 4.4 浏览器端 walkthrough(人工)

| # | 操作 | 预期 |
|---|---|---|
| 1 | `devices.html` 详情侧栏 split button 主按钮 | 直接弹「确认软件重启 · 重启系统」,与施工前外观完全一致 |
| 2 | `devices.html` caret popover → 选「重启点单屏(左)」 | 进入对应确认对话,文案/样式一致 |
| 3 | `devices.html` 旧远程操作 sheet → 「机构重启」 | 进入 4 选 1 子面板,一致 |
| 4 | `devices.html` 任一确认对话 → 「无法远程处理?查看机器按钮位置」 | 硬件指导面板,steps/warning 与原版逐字段一致 |
| 5 | `faults.html` 列表行「远程操作」→ 「机构重启」 | 进入与 §1.4 状态机一致的子菜单 |
| 6 | `faults.html` 走完一遍「确认软件重启」 | 顶部出现 toast「已向设备 X 下发指令:Y」,行内「操作记录」(若可见)新增一条 |
| 7 | `faults.html` 走完一遍「我知道了」 | 面板关闭,无写入 |
| 8 | `faults.html` 列表行「远程操作」→ 「设备开门 / 设备停售 / 音量调节」 | 仍是原本的 `alert`,行为未受影响 |

#### 4.5 回归

`node --test tests/*.test.js` 全套与施工前基线对比:
- 4 个已知基线失败(`device-search.location-name`、两个 `login-pages`、`pages.font-stack`)不应有新增
- `tests/faults.notify-email.test.js`(fault-push-channels 已有)继续 PASS
- `tests/fault-push-channels.behavior.test.js` / `tests/fault-push-channels.runtime.test.js` 继续 PASS

## 风险与权衡

- **CSS 漂移**:共用的 `.detail-fault-sheet-*` 三个 class 在 devices.html 源端保留、模块持副本。如未来有人改了 devices.html 这三个 class 但未同步模块,会再次产生不一致。对策:devices.html 这三个 class 头加同步注释。彻底的解决要么把这三个 class 也搬走(连带 devices.html 的非重启面板),要么改 inline-css 策略 —— 都超出本期范围。
- **4 个 render 函数保留名字**:函数体变一行委派、命名留旧 —— 现有调用点(包括 split button HTML 内 onclick)零修改。代价是 devices.html 多出 4 行"过场壳",可读性上略冗余。判断:相比一次性改 5+ 处调用点的回归风险,留壳是更小的成本。
- **状态机外壳留在 devices.html**:`handleDetailRemoteAction` 仍然在 devices.html,因为它同时承担音量调节、状态编辑等非重启分支。共享模块只接管"重启"子图,不接管整个状态机。这意味着 devices.html 的 restart 分支与共享模块的状态机存在轻微的概念重叠 —— 但实际执行路径上,devices.html 把渲染委派出去,共享模块的 `handle/open/close` 只在 faults.html 直接使用。两边走得通,不冲突。
- **Snapshot 测试维护**:如果未来需要改重启文案/步骤,要同步改 snapshot 字符串。给 snapshot 测试加注释说明这一点。

## 上线步骤

1. 在 Task 1 的「先捕获基线」步骤里,用临时 Node 脚本 + `devices.html` 现有的 `getDetailRemoteRestartMeta` 等函数抽出 9 段 HTML,作为字符串固化到 `tests/fault-restart-flow.snapshot.test.js`。
2. 新增 `shared/fault-restart-flow.js`(模块骨架 + ACTIONS + getActionMeta),配套 `behavior.test` 推进。
3. 实现 `renderSubPanel` / `renderConfirmDialog` / `renderHardwareGuide`,配套 snapshot.test 推进。
4. 实现状态机 `open/handle/close` 与 `injectStyles`,behavior.test 收尾。
5. `devices.html` 改造:引入模块、改 5 个函数为委派、删纯重启 CSS、加同步注释。runtime.test R-1/R-3 ~ R-7 + R-11 全部 PASS。
6. `faults.html` 改造:引入模块、加 panel 容器、新增 `openFaultRestartFlow` / `appendFaultOperationRecord` / `showToast`、改按钮 onclick。runtime.test R-2 / R-8 / R-9 / R-10 全部 PASS。
7. 跑全套 + 浏览器端 walkthrough,8 步全过 → 提交。
