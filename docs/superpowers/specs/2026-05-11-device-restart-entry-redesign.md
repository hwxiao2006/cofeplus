# 设备重启按钮入口重做

- **日期**: 2026-05-11
- **模块**: device-mgmt · devices.html
- **范围**: 设备详情页的重启入口按钮(入口层)
- **基线**: `origin/main` @ d3a2b22

## 背景

设备详情页当前「重启系统 / 重启其他」两个按钮位于 `设备状态` 卡片最底部的"快捷操作"行。main 上的 CSS (`.detail-status-recovery-btn`) 把按钮实现为 `background: transparent` + `font-size: 12px` + `padding: 4px 6px` 的文本按钮,说明文字 `.detail-status-recovery-copy` 被 `display: none` 隐藏。结果:

- 视觉权重与普通表格文字相同,无法一眼识别为可操作元素
- 位置深,需要滚过 5~6 行状态字段才能看到
- 桌面宽屏下按钮被压到卡片右下角一小块区域

重启是"高频恢复动作"(代码注释原话),应当在详情页首屏、不滚动就能看到、且视觉权重明显高于普通按钮。

## 目标

让运营人员打开任意设备详情页,**不滚动**就能看到重启入口,并能通过**一次点击**触发最常用的"重启系统"流程,或通过**额外一次交互**选择重启具体部件。

不在范围:确认页、bottom sheet、硬件指引页、toast、日志记录 —— 保持原样。

## 设计

### 位置

侧栏 `detail-side-action-list` 的**第一项**,置于现有蓝色「远程操作」按钮之上。

### 形态:Split button(划分式按钮)

按钮整体是一个块,内部分两区:

```
┌────────────────────────────┬────┐
│  ⟳  重启设备               │ ▾  │
└────────────────────────────┴────┘
     主区 (≈80%)               右区 (≈20%)
```

- **主区** · 点击 → 直接进入现有「重启系统」确认页(等价于 main 的 `openDetailQuickRestart(deviceId, '重启系统')`)
- **右区(▾)** · 点击 → 弹出 popover,列出部件选项(popover 内的 label 省略"重启"前缀,因为按钮体已经是"重启设备";实际下发给原逻辑时仍使用完整字符串):
  - `点单屏(左)` → 调用 `handleDetailRemoteAction('重启点单屏（左）')`
  - `点单屏(右)` → 调用 `handleDetailRemoteAction('重启点单屏（右）')`
  - `六轴机械臂` → 调用 `handleDetailRemoteAction('重启六轴机械臂（注意安全，谨慎使用）')`
  全部复用现有「部件确认页 → 硬件指引页」流程,不新增任何后续页面

### 视觉规格

| 项 | 值 |
|---|---|
| 背景 | `linear-gradient(135deg, #14b8a6, #0f766e)` teal 青绿渐变 |
| 边框 | `1px solid #0f766e` |
| 文字 | `#fff`, `font-size: 13px`, `font-weight: 700` |
| 内边距 | 主区 `10px 12px`;右区 `10px` |
| 圆角 | 整体 `6px`,内部区块不再单独圆角 |
| 阴影 | `0 6px 14px rgba(15, 118, 110, 0.22)` |
| 分隔线 | 主区和右区之间 `border-left: 1px solid rgba(255,255,255,0.25)` |
| 图标 | 主区左侧"旋转箭头"图标,`13×13px`,同 currentColor |
| caret | 右区 5px 向下三角,打开 popover 时旋转 180° |

### 交互规格

**Hover**
- 主区 hover: 叠加 `rgba(0,0,0,0.08)` 遮罩
- 右区 hover: 叠加 `rgba(0,0,0,0.15)` 遮罩(比主区略深,作为区分反馈)

**Popover**
- 位置: 按钮下方 6px,右对齐按钮右边缘
- 宽度: 最小 200px
- 样式: 白底 1px 边 `#e5e7eb`,`border-radius: 8px`,阴影 `0 10px 30px rgba(15,23,42,0.12)`
- 项 hover: 背景 `#ccfbf1`(浅青绿),文字 `#0f766e`
- 六轴机械臂项: 右侧灰小字标注"谨慎",前缀圆点用 `#dc2626`(其他项用 teal `#0f766e` 点)
- 关闭条件: 点击 popover 外任意位置 / 再次点击 ▾ / 选中任一项

**键盘**
- 主区和 ▾ 各自可 Tab 聚焦,焦点可见
- 主区 Enter/Space = 触发主操作
- ▾ Enter/Space = 切换 popover
- popover 打开时,Esc 关闭;Up/Down 在项间移动(不强制,锦上添花)

### 配色选择说明

采用 teal 青绿(`#14b8a6 → #0f766e`),理由:

1. **和品牌蓝同族但显眼** · teal 是蓝绿过渡色,与主色蓝同冷调,不会造成色彩冲突,但色相差异足以让按钮从蓝色侧栏里跳出来
2. **不抢告警色的位置** · 红色留给真正的故障告警,避免告警色滥用导致失效
3. **语义匹配** · 重启不是破坏性操作(代码注释原话:"点击后进入确认页,不会直接执行"),青绿接近"恢复/健康"的含义,比红橙更准确
4. **权重够** · 渐变 + 白字 + 阴影,视觉权重明显高于旁边的亮蓝「远程操作」,符合"侧栏第一项"的层级

**风险**: teal 有时会和"成功/已完成"状态色混淆,需在项目里约束 —— 本产品当前并未将 teal 用于成功态,可控。

### 清理

移除 `renderDeviceStatusCard` 里的 `recoveryAction` 片段(HTML + 拼接),连带清理其对应 CSS:
- `.detail-status-recovery-action`
- `.detail-status-recovery-head`
- `.detail-status-recovery-title`
- `.detail-status-recovery-copy`
- `.detail-status-recovery-actions`
- `.detail-status-recovery-btn`(含 `.primary` / `.secondary`)
- 响应式里对应覆盖规则

保留 `openDetailQuickRestart` 函数,新按钮主区继续调用它。`openDetailRestartOptions`(打开 bottom sheet 的函数)在本改动后不再被调用 —— popover 代替了它。函数本身保留(以防其他入口引用,且删除会扩大改动面),但在函数注释里标注 "legacy,已被 split button popover 代替"。确认页、硬件指引页流程完全复用。

## 文件边界

全部改动集中在 `devices.html` 单文件,涉及:

| 区域 | 动作 |
|---|---|
| `<style>` 顶部(~750-1330 行)| 新增 `.detail-side-restart-split` 系列 CSS;删除 `.detail-status-recovery-*` |
| 响应式 `<style>`(~3310、3390 行附近)| 同步删除 recovery 响应式规则 |
| `renderDeviceStatusCard`(~6393 行)| 删除 `recoveryAction` 拼接,卡片恢复为纯信息卡 |
| 侧栏渲染(~8962 行)| 在 `detail-side-action-list` 第一个 button 前插入 split button DOM + popover |
| 新增 JS | `toggleDetailRestartPopover()`、`openDetailRestartPart(name)` |

## 测试

新增测试,仍在 `tests/` 目录下,用项目现有 Node.js test runner:

- `tests/devices.restart-split-button.runtime.test.js`
  - 侧栏渲染后,split button 主区 + caret 存在且可聚焦
  - 点击主区调用 `openDetailQuickRestart(deviceId, '重启系统')`
  - 点击 caret 展开 popover,包含 3 个部件项
  - popover 外点击或再次点 caret 关闭
  - 选中 `点单屏(左)` 调用 `openDetailRestartOptions` 或等价入口并指向正确部件
  - 状态卡片不再渲染 `.detail-status-recovery-action`

保留现有的 `tests/devices.entry-detail.test.js`、`devices.page-redesign.test.js` 等,不应因本次改动失败。

## 不改动清单(重申)

- 确认页、bottom sheet、硬件指引页 HTML/CSS/JS 全部保持现状
- `openDetailQuickRestart` / `openDetailRestartOptions` 的函数体不改,只改调用点
- 其他页面(`faults.html`、`overview.html` 等)不动
- 设计 token / 全局主色变量不动(teal 青绿仅作为本按钮的局部配色,不引入全局变量)

## 风险

- **teal 青绿在项目里是首次使用**:如果后续其他"非告警、非主操作"按钮也需要辅色,应优先复用 teal,避免各处各引一套辅色。建议顺手在 CSS 注释里标注 "teal 专用于重启类恢复操作"。
- **和成功态混淆风险**:项目当前并未把 teal 用于"成功/已完成"状态,本次改动后也不应扩散 teal 到状态类标签。
- **split button 的可访问性**:主区和 caret 各自要是独立 button。测试里需要覆盖键盘 Tab 顺序。
