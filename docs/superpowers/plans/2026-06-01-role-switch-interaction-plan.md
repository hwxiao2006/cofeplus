# 角色切换交互优化方案

> 分支：`feat/role-based-permission`
> 涉及文件：`staff-management.html`（唯一）
> 日期：2026-06-01

---

## 1. 现状问题

当前 `selectRole(roleId)` 一点卡片就立刻全做完三件事：覆写 `selectedRoleId`、改摘要条文案为「已选择：新角色」、调 `applyRolePermissions()` 把所有权限 checkbox 推平成新角色默认值。带来三个体验问题：

1. **看不到原有角色**。比如编辑「张店长」打开弹窗时弹窗里其实已经是"店长"，但点了「运维人员」之后，UI 只剩"已选择：运维人员"，原本是哪个角色彻底消失。
2. **自定义权限被静默丢弃**。如果用户已经在店长基础上勾了/去了几项（橙色提示条里的 `+N / -M`），换角色时一个确认都没有，全部清掉。
3. **「重新选择」语义错位**。它实际是把 role 置成 `custom` 并隐藏摘要条 —— 既不还原上一个角色，也不清空权限，更像是"我不再属于这个模板了，但权限保留"。用户预期是"撤回这次切换"。

---

## 2. 设计目标

- **任何时候都能一眼看到当前角色**，包括"自定义"也算一种当前状态。
- **切换是个两步动作**：点卡片 = 进入"待确认"，明确告诉用户这次切换会带来什么影响，再由用户决定 `确认` 或 `取消`。
- **保留撤销路径**：确认后仍可在不刷新页面的前提下回到上一个角色 + 上一份权限。
- **不动数据模型与 shared 文件**：`role-definitions.js` / `permissions-registry.js` 完全不改。只动 `staff-management.html` 的 UI、CSS、几个 JS 函数。

---

## 3. 新交互（状态机）

### 状态 A — 无角色（新员工初次打开弹窗）

```
┌ 选择角色 * ──────────────────────────────────┐
│ 选择角色模板可快速分配权限，之后可以微调       │
│ ┌──────┬──────┬──────┬──────┐                │
│ │ 👑   │ 🏪   │ 🔧   │ 💼   │                │
│ │管理员│ 店长 │运维  │ 职员 │                │
│ └──────┴──────┴──────┴──────┘                │
└──────────────────────────────────────────────┘
```

- 顶部没有"当前角色"条
- 卡片无选中态

### 状态 B — 已确认某角色（含编辑现有员工时进入）

```
┌ 选择角色 * ──────────────────────────────────┐
│ ┌── 当前角色 ────────────────────────────┐   │
│ │ 👑 当前角色：超级管理员                  │   │ ← 静默、纯描述
│ └────────────────────────────────────────┘   │
│ ┌──────┬──────┬──────┬──────┐                │
│ │ 👑✓  │ 🏪   │ 🔧   │ 💼   │                │
│ │管理员│ 店长 │运维  │ 职员 │                │
│ └──────┴──────┴──────┴──────┘                │
└──────────────────────────────────────────────┘

# 权限树正上方（如果当前权限 ≠ 角色默认）：
ℹ️ 基于"超级管理员"角色，已添加 2 项权限，移除 1 项权限   ← 既有橙色提示条
```

- 顶部"当前角色"条**只回答"我是谁"**，不显示微调统计（避免"已微调"在编辑场景下被误读为"刚动过"）
- 微调统计完全由权限树上方的**既有橙色 `.permission-customization-hint`** 承担，它本来就紧贴 checkbox，物理相邻才好理解
- 当前角色卡片绿色选中

### 状态 C — 待确认切换（点击另一张卡片之后）

```
┌ 选择角色 * ──────────────────────────────────────────┐
│ ┌── 即将切换 ──────────────────────────────────────┐ │
│ │ 👑 超级管理员  →  🏪 店长                          │ │
│ │ 此切换将保留 10 项重叠权限，引入店长的 11 项默认权限│ │
│ │ ⚠ 你的 2 项自定义新增 / 1 项自定义移除将被覆盖     │ │
│ │                    [确认切换]   [取消，保留原角色] │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────┬──────┬──────┬──────┐                        │
│ │ 👑✓  │ 🏪⋯  │ 🔧   │ 💼   │ ← 新卡片虚线边框         │
│ │管理员│ 店长 │运维  │ 职员 │                          │
│ └──────┴──────┴──────┴──────┘                        │
└──────────────────────────────────────────────────────┘
```

- 顶部条变为"即将切换"对比条
- 当前角色卡片仍然绿色（提醒用户原角色还在）
- 新卡片用虚线 + "⋯" 角标，表示待确认
- **权限树不动**（这是关键）：直到用户点「确认切换」前，所有 checkbox 维持原角色状态
- 自定义统计差异 = `calculatePermissionChanges(原角色, 当前权限)`

### 状态 D — 确认后

```
┌── 当前角色 ──────────────────────────────────────────┐
│ 🏪 当前角色：店长 · 已微调（+0 / -0）  [↩ 撤销切换]   │
└─────────────────────────────────────────────────────┘
```

- **撤销按钮直接挂在「当前角色」条右侧**，仅在 `lastCommitSnapshot != null` 时显示
- 点撤销 → 回到状态 B 的原角色状态，权限/角色/scopes 一并还原
- 一旦用户在权限树里手动 toggle 任意 checkbox，`lastCommitSnapshot` 立即置 null，撤销按钮消失（避免误回滚刚做的微调）
- **不再使用独立的 toast 容器**，避免它在初始化时被误触发，也避免"当前角色"条被 toast 挤占

### 状态 E — 取消

直接回到状态 B，对比条消失，新卡片虚线复原。

### 边界

| 当前角色 | 点击行为 | 结果 |
| --- | --- | --- |
| 无 (custom) | 点角色卡片 | 直接进入状态 C：`自定义 → 店长`，对比条说明"将清空当前 N 项自定义勾选" |
| 同一角色 | 点已选中卡片 | 无操作 |
| 有角色无微调 | 点新卡片 | 状态 C 但去掉黄色警告行（只有正常对比信息） |

---

## 4. 状态机 & 数据

引入两个新变量，替换掉现有的 `selectedRoleId`（保留向后兼容名字也行）：

| 变量 | 含义 |
| --- | --- |
| `committedRoleId` | 已确认的角色（写入员工记录时取这个） |
| `pendingRoleId` | 待确认的目标角色，`null` 表示无切换中 |
| `lastCommitSnapshot` | `{ roleId, permissions:[], moduleScopes:{} }`，确认前的上一份状态，给"撤销"用 |

`selectedRoleId` 作为 alias 等于 `pendingRoleId ?? committedRoleId`，保证既有读取逻辑不挂。

---

## 5. 代码改动清单

**只动 `staff-management.html` 一个文件**。

### 5.1 HTML（约 +25 行）

替换现有 `#roleSummaryBar` 块为两块容器：

```html
<div class="role-current-banner" id="roleCurrentBanner" hidden>
  <span class="role-banner-icon" id="roleCurrentIcon">👑</span>
  <span class="role-banner-label">当前角色：</span>
  <span class="role-banner-name" id="roleCurrentName">超级管理员</span>
  <button type="button"
          class="role-banner-undo"
          id="roleCurrentUndoBtn"
          onclick="undoRoleSwitch()"
          hidden>↩ 撤销切换</button>
</div>
<!-- 注意：不再有 #roleCurrentTweak 节点；微调状态完全由现有的 #permissionCustomizationHint 承担 -->


<div class="role-switch-preview" id="roleSwitchPreview" hidden>
  <div class="role-switch-line">
    <span id="roleSwitchFromIcon">👑</span>
    <span id="roleSwitchFromName">超级管理员</span>
    <span class="role-switch-arrow">→</span>
    <span id="roleSwitchToIcon">🏪</span>
    <span id="roleSwitchToName">店长</span>
  </div>
  <div class="role-switch-detail" id="roleSwitchDetail">保留 10 项，新增 3 项，移除 4 项</div>
  <div class="role-switch-warning" id="roleSwitchWarning" hidden>⚠ 你的 N 项自定义将被覆盖</div>
  <div class="role-switch-actions">
    <button type="button" class="btn btn-primary" onclick="confirmRoleSwitch()">确认切换</button>
    <button type="button" class="btn btn-ghost" onclick="cancelRoleSwitch()">取消，保留原角色</button>
  </div>
</div>
```

删除现有的 `#roleSummaryBar`。**不**新增独立 toast 容器，撤销按钮直接做进「当前角色」条里。

### 5.2 CSS（约 +60 行）

新增 4 个类：`.role-current-banner` / `.role-switch-preview` / `.role-undo-toast` / `.role-card[data-pending="true"]`（虚线边）。复用现有变量 `--primary` / `--warning`，与现有摘要条风格一致。

### 5.3 JS

#### 改：`selectRole(roleId)` → `requestRoleSwitch(roleId)`

```js
function requestRoleSwitch(roleId) {
  if (roleId === committedRoleId) return;     // 同角色无操作
  pendingRoleId = roleId;
  renderRoleCards();                          // 当前卡片仍 selected，新卡片 data-pending=true
  renderRoleSwitchPreview();                  // 顶部对比条
  hideRoleCurrentBanner();                    // 切换期间用对比条占位
  // 注意：不调 applyRolePermissions
}
```

#### 新：`confirmRoleSwitch()`

```js
function confirmRoleSwitch() {
  if (!pendingRoleId) return;
  lastCommitSnapshot = snapshotCurrentState();   // 仅此一处赋值 ← 铁律
  committedRoleId = pendingRoleId;
  pendingRoleId = null;
  applyRolePermissions(committedRoleId);         // 真正改权限
  renderRoleCards();
  hideRoleSwitchPreview();
  renderRoleCurrentBanner();                     // 含撤销按钮，因 snapshot != null
}
```

**铁律：`lastCommitSnapshot` 只能在 `confirmRoleSwitch()` 内被赋值。** `fillStaffForm`、`resetStaffForm`、`init` 等任何其他位置都不准碰它，且必须显式置 `null` —— 否则就会出现"打开弹窗就看到撤销按钮"的 bug。

#### 新：`cancelRoleSwitch()`

```js
function cancelRoleSwitch() {
  pendingRoleId = null;
  renderRoleCards();
  hideRoleSwitchPreview();
  showRoleCurrentBanner();
}
```

#### 新：`undoRoleSwitch()`

```js
function undoRoleSwitch() {
  if (!lastCommitSnapshot) return;
  committedRoleId = lastCommitSnapshot.roleId;
  restorePermissionsFromSnapshot(lastCommitSnapshot);
  lastCommitSnapshot = null;
  renderRoleCards();
  renderRoleCurrentBanner();   // 撤销按钮因 snapshot=null 自动隐藏
}
```

#### 新增钩子：手动改权限后 invalidate snapshot

```js
// 在 handlePermissionChildChange / handlePermissionParentChange 里追加一行
if (lastCommitSnapshot) {
  lastCommitSnapshot = null;
  renderRoleCurrentBanner();   // 撤销按钮消失
}
```

理由：用户已经在新角色基础上做微调，再撤销回旧角色会丢掉这些微调，反而成为新的"静默丢失"。

#### 新：`renderRoleSwitchPreview()`

调 `calculatePermissionChanges(committedRoleId, getRolePermissions(pendingRoleId))` 得出保留/新增/移除统计；再调一次得出"用户当前的自定义将丢失"行。文案直接写进 DOM。

#### 改：`renderRoleCards()`

```js
roles.map(role => {
  const isSelected   = role.id === committedRoleId;
  const isPending    = role.id === pendingRoleId;
  return `<div class="role-card ${isSelected ? 'selected' : ''}"
              data-pending="${isPending}"
              data-role-id="${role.id}"
              onclick="requestRoleSwitch('${role.id}')">…`
});
```

#### 改：`fillStaffForm(targetStaff)` 与 `resetStaffForm()`

- `fillStaffForm`：
  ```js
  committedRoleId = targetStaff.role?.id || 'custom';
  pendingRoleId = null;
  lastCommitSnapshot = null;          // ← 关键：清掉，避免撤销按钮在初始化时出现
  renderRoleCurrentBanner();          // 静默展示，无任何动效/toast
  ```
- `resetStaffForm`：所有三个变量都置 null/custom，banner 隐藏。

**绝对禁止**：这两个函数都不准调 `confirmRoleSwitch()` 或任何会赋值 `lastCommitSnapshot` 的逻辑。回填数据 ≠ 切换角色。

#### 删：`resetRoleSelection()`

被 `cancelRoleSwitch()` 取代；HTML 里 `重新选择` 按钮一起删。

#### 兼容：`selectedRoleId`

页面其它地方（保存时 `role: selectedRoleId !== 'custom' ? {...} : null` 等）读 `selectedRoleId` 的位置，统一改成读 `committedRoleId`。grep 一下大约 5~6 处。

### 5.4 测试

`tests/staff-management.behavior.test.js` 已存在。新增 3 个 case：

1. 状态 B → C：点新卡片后，权限树 checkbox 不变，对比条显示「原 → 新」。
2. 状态 C → D：确认后权限树更新，撤销 toast 出现，再点撤销恢复原状。
3. 状态 C → E：取消后回到 B，pendingRoleId 清空。

---

## 6. 不做的事

- 不引入 modal-in-modal 的 confirm dialog（嵌套弹窗体验差，且本来就在弹窗里）。
- 不引入多步撤销栈，只支持撤回最近一次切换。
- 不动 `role-definitions.js` / `permissions-registry.js`。
- 不改 4 个角色模板的权限明细。
- 不在角色卡片上做拖拽、收藏、自定义模板存档之类的扩展。

---

## 7. 预估工作量

- HTML/CSS：~30 分钟
- JS 状态机改造：~60 分钟
- 测试用例：~30 分钟
- 浏览器手测（新增 / 编辑 / 取消 / 撤销 / 自定义起点 五条路径）：~20 分钟

合计 ~2.5 小时，单文件改动，无 shared 文件修改风险。

---

## 8. 用户已拍板的决策（2026-06-01）

| # | 决策点 | 选定 |
| --- | --- | --- |
| Q1 | 撤销按钮位置 | **挂在「当前角色」条右侧**；不再使用独立 toast |
| Q2 | 打开弹窗已有角色时的呈现 | **静默显示「当前角色」，无任何动效**；不出现撤销按钮、不出现 toast |
| Q2b | 「当前角色」条上的「已微调」徽标 | **彻底砍掉**；微调统计交回原有橙色 `.permission-customization-hint` |
| Q3 | 微调警告位置（C 状态） | 默认：单独一行黄色警告（用户未否决） |
| Q4 | custom 起点切角色 | 默认：走完整两步（用户未否决） |
| Q5 | 切换时 `moduleDeviceScopes` | 默认：按角色覆盖，撤销时一并回滚（用户未否决） |

## 9. 防 regression 测试用例（必须新增）

1. **回填不触发切换 UI**：mock 一个 `targetStaff.role = { id: 'super_admin' }`，调 `fillStaffForm` 后断言：
   - `#roleCurrentBanner` 可见、文案 = "当前角色：超级管理员"
   - `#roleCurrentUndoBtn` **hidden**
   - `#roleSwitchPreview` **hidden**
   - 全局 `lastCommitSnapshot === null`
2. **手动改权限后撤销失效**：confirm 一次切换后，模拟点击一个 permission checkbox，断言撤销按钮消失、`lastCommitSnapshot === null`。
3. **关闭弹窗再打开不残留**：连续两次 `fillStaffForm`（一次有 role 一次没有），断言第二次撤销按钮不会"穿越"出来。
