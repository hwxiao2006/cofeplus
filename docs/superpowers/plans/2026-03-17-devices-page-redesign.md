# 设备管理列表页重新设计 — 实现方案

**日期：** 2026-03-17
**设计稿：** `designs/device-management-redesign.pen`
**目标文件：** `devices.html`

---

## 一、设计风格概述

采用 Japanese Swiss 极简风格，双字体系统，零圆角，高信息密度。

### 设计变量

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-page` | `#FAFAFA` | 页面背景（暖白） |
| `--bg-sidebar` | `#000000` | 侧边栏背景（纯黑） |
| `--bg-surface` | `#F5F5F5` | 表头/卡片背景 |
| `--border` | `#E5E5E5` | 边框色 |
| `--text-primary` | `#000000` | 主文字 |
| `--text-secondary` | `#5E5E5E` | 次要文字 |
| `--text-tertiary` | `#999999` | 辅助文字/占位符 |
| `--accent-red` | `#DC2626` | 强调色/故障状态 |
| `--accent-green` | `#22C55E` | 运行状态 |
| `--accent-blue` | `#3B82F6` | 链接/操作色 |
| `--text-on-dark` | `#FAFAFA` | 深色背景上的文字 |
| `--font-ui` | `Sora` | UI字体 |
| `--font-data` | `IBM Plex Mono` | 数据/编号字体 |

---

## 二、桌面端布局（≥1025px）

### 2.1 整体结构

```
┌──────┬──────────────────────────────────────┐
│      │  Content Area (padding: 36px 48px)   │
│  64  │  ┌─────────────────────────────────┐  │
│  px  │  │ Page Header                     │  │
│      │  ├─────────────────────────────────┤  │
│ Side │  │ Metrics Row (4列等分)            │  │
│ bar  │  ├─────────────────────────────────┤  │
│      │  │ Filter Bar                      │  │
│ Icon │  ├─────────────────────────────────┤  │
│ Only │  │ Device Table                    │  │
│      │  ├─────────────────────────────────┤  │
│      │  │ Pagination                      │  │
│      │  └─────────────────────────────────┘  │
└──────┴──────────────────────────────────────┘
```

- 画布尺寸：1440 × 900
- 侧边栏：64px 宽，纯黑背景，仅图标导航（lucide 图标集）
- 内容区：flex-grow，垂直排列，gap: 32px
- 各区块间距：32px

### 2.2 侧边栏（64px Icon Sidebar）

纯黑背景，垂直排列，padding: 24px 0，gap: 8px。

图标列表（18px，#666666 默认，当前页 #DC2626）：
1. `coffee` — Logo（24px，#FAFAFA）
2. 32px spacer
3. `layout-grid` — 概览
4. `trending-up` — 数据
5. `monitor` — 设备管理（当前页，红色高亮）
6. `users` — 人员
7. `file-text` — 订单
8. `package` — 物料
9. `zap` — 故障
10. `settings` — 设置

### 2.3 页面头部（Page Header）

水平排列，两端对齐（space-between）。

左侧：
- 标题 `设备管理` — Sora 24px 600 weight，letter-spacing: -0.5
- 副标题 `管理和监控所有咖啡设备` — Sora 13px，#5E5E5E

右侧：
- `+ 设备录入` 按钮 — 背景 #DC2626，文字 #FAFAFA，Sora 13px 500，padding: 10px 20px

### 2.4 指标行（Metrics Row）

水平排列，4列等分，底部对齐（align-items: end）。各列之间用右边框分隔（最后一列无右边框）。

| 指标 | 标签 | 值 | 值字体 |
|------|------|-----|--------|
| m1 | 设备总数 | 18 | IBM Plex Mono 32px 600 |
| m2 | 运行中 | 15 | IBM Plex Mono 32px 600, #22C55E |
| m3 | 故障 | 1 | IBM Plex Mono 32px 600, #DC2626 |
| m4 | 停用 | 2 | IBM Plex Mono 32px 600, #999999 |

- 标签：Sora 12px，#999999
- 分隔线：右边框 1px #E5E5E5
- 列 padding：首列 right 24px，中间列 left+right 24px，末列 left 24px

### 2.5 筛选栏（Filter Bar）

水平排列，gap: 12px。

1. 搜索框（320px）：1px #E5E5E5 边框，padding: 10px 14px
   - search 图标 14px #999999 + 占位文字 `搜索设备编号或点位...` Sora 13px #999999
2. 状态筛选：`全部状态` + chevron-down 图标
3. 点位筛选：`全部点位` + chevron-down 图标

### 2.6 设备表格（Device Table）

1px #E5E5E5 外边框，clip: true，垂直排列。

**表头**（背景 #F5F5F5，padding: 16px 20px，底部 1px 边框）：

| 列 | 宽度 | 字体 |
|----|------|------|
| 设备编号 | flex | Sora 12px 500, #5E5E5E |
| 商户 | flex | 同上 |
| 点位 | flex | 同上 |
| 状态 | flex | 同上 |
| 停卖 | flex | 同上 |
| 最近心跳 | flex | 同上 |
| 操作 | flex | 同上 |

**数据行**（padding: 20px，底部 1px 边框，最后一行无底边框）：

示例数据（来自 `shared/admin-mock-data.js`）：

| 设备编号 | 商户 | 点位 | 状态 | 停卖 | 最近心跳 | 操作 |
|---------|------|------|------|------|---------|------|
| RCK386 | 星巴克咖啡 | 上海市中心店 | 🟢 运行中 | 否 | 2026-02-11 15:06 | 查看 |
| RCK406 | 瑞幸咖啡 | 上海市中心店 | 🔴 故障 | 否 | 2026-02-11 14:30 | 查看 |
| RCK402 | 星巴克咖啡 | 上海市中心店 | ⚫ 停用 | 是 | 2026-02-11 13:45 | 查看 |
| RCK405 | 太平洋咖啡 | 北京朝阳门店 | 🟢 运行中 | 否 | 2026-02-11 15:02 | 查看 |
| RCK385 | Costa咖啡 | 广州天河店 | 🟢 运行中 | 否 | 2026-02-11 15:01 | 查看 |

状态样式：
- 运行中：圆点 #22C55E + 文字 #22C55E
- 故障：圆点 #DC2626 + 文字 #DC2626
- 停用：圆点 #999999 + 文字 #999999

设备编号字体：IBM Plex Mono 13px 500
其他数据字体：Sora 13px
操作链接：Sora 13px #3B82F6

### 2.7 分页栏（Pagination）

水平排列，两端对齐。

- 左侧：`显示 1-15 条，共 18 条` — IBM Plex Mono 12px，#5E5E5E
- 右侧：页码按钮组（gap: 8px）
  - `上一页` / `下一页` — Sora 12px，padding: 6px 12px，1px #E5E5E5 边框
  - 当前页码 `1` — 背景 #000000，文字 #FAFAFA

---

## 三、移动端布局（<768px）

### 3.1 整体结构

```
┌─────────────────────────┐
│ Mobile Header           │  58px
├─────────────────────────┤
│                         │
│  Metrics (2×2 grid)     │
│  Search Bar             │
│  Filters (2 col)        │
│  Device Cards           │
│                         │
│              ┌───┐      │
│              │FAB│      │  56×56, 右下角悬浮
│              └───┘      │
└─────────────────────────┘
```

- 画布尺寸：390 × 844（iPhone 标准）
- 布局模式：`none`（绝对定位），Header y:0，Content y:53，FAB y:768 x:314
- 无侧边栏，使用汉堡菜单

### 3.2 移动端头部（Mobile Header）

水平排列，两端对齐，padding: 16px 20px，底部 1px 边框。

- 左侧：`设备管理` — Sora 18px 600，letter-spacing: -0.5
- 右侧：`menu` 汉堡图标 20px

### 3.3 移动端内容区（Mobile Content）

垂直排列，gap: 20px，padding: 20px 16px（底部 80px 为 FAB 留空）。

#### 指标网格（2×2）

4个指标卡，2列排列，gap: 8px。每个卡片：padding: 12px，1px #E5E5E5 边框。

| 卡片 | 标签 | 值 | 值颜色 |
|------|------|-----|--------|
| mm1 | 设备总数 | 18 | #000000 |
| mm2 | 运行中 | 15 | #22C55E |
| mm3 | 故障 | 1 | #DC2626 |
| mm4 | 停用 | 2 | #999999 |

- 标签：Sora 11px，#999999
- 值：IBM Plex Mono 22px 600

#### 搜索框

全宽，padding: 10px 14px，1px 边框，gap: 8px。
- search 图标 14px #999999 + `搜索设备编号...` Sora 13px #999999

#### 筛选器（2列）

2个下拉框并排，gap: 8px，各占 50%。
- `全部状态` / `全部点位` + chevron-down 图标
- padding: 8px 12px，1px 边框

#### 设备卡片列表

垂直排列，gap: 12px。每张卡片结构：

```
┌─────────────────────────────────┐
│ ██ 左侧状态条(3px宽)            │
│                                 │
│  RCK386              🟢 运行中   │
│                                 │
│  ┌──────────┐ ┌──────────────┐  │
│  │商户       │ │点位           │  │
│  │星巴克咖啡  │ │上海市中心店    │  │
│  └──────────┘ └──────────────┘  │
│                                 │
│  🕐 2026-02-11 15:06            │
│                                 │
│  查看详情 →                      │
└─────────────────────────────────┘
```

卡片样式：
- padding: 16px，1px #E5E5E5 边框
- 左侧状态条：3px 宽色条（绿/红/灰）
- 设备编号：IBM Plex Mono 15px 600
- 状态徽章：圆点 + 文字，对应颜色
- 商户/点位：灰色背景标签块（#F5F5F5），Sora 12px
- 心跳时间：clock 图标 12px + IBM Plex Mono 12px，#999999
- 查看详情：Sora 13px #3B82F6 + `→`

### 3.4 FAB 按钮

- 位置：绝对定位，右下角（x: 314, y: 768）
- 尺寸：56 × 56，圆角 28px（圆形）
- 背景：#DC2626
- 图标：plus 24px #FAFAFA
- 功能：跳转设备录入页

---

## 四、实现步骤

### Step 1：更新 CSS 变量

替换 `devices.html` 中 `:root` 的 CSS 变量为新设计系统变量。保留功能性变量，更新视觉变量。

```css
:root {
  /* 新设计系统 */
  --bg-page: #FAFAFA;
  --bg-sidebar: #000000;
  --bg-surface: #F5F5F5;
  --border: #E5E5E5;
  --text-primary: #000000;
  --text-secondary: #5E5E5E;
  --text-tertiary: #999999;
  --accent-red: #DC2626;
  --accent-green: #22C55E;
  --accent-blue: #3B82F6;
  --text-on-dark: #FAFAFA;
  --font-ui: 'Sora', sans-serif;
  --font-data: 'IBM Plex Mono', monospace;
}
```

### Step 2：引入字体

在 `<head>` 中添加 Google Fonts 引用：

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Step 3：重构侧边栏

将现有 240px 文字侧边栏改为 64px 纯图标侧边栏：
- 移除所有文字导航项
- 使用 lucide 图标（SVG inline 或 icon font）
- 当前页（设备管理）图标高亮为 `--accent-red`
- 其他图标 `#666666`

### Step 4：重构桌面端内容区

1. **Page Header**：标题 + 副标题左侧，`+ 设备录入` 按钮右侧
2. **Metrics Row**：4列等分指标，右边框分隔，数据用 IBM Plex Mono
3. **Filter Bar**：搜索框(320px) + 状态下拉 + 点位下拉
4. **Device Table**：零圆角表格，表头灰色背景，状态用彩色圆点+文字
5. **Pagination**：左侧条数信息，右侧页码按钮

### Step 5：实现移动端响应式

在 `@media (max-width: 768px)` 中：
1. 隐藏桌面侧边栏，显示移动端头部（汉堡菜单）
2. 指标改为 2×2 网格
3. 隐藏表格，显示卡片列表
4. 卡片带左侧状态色条
5. 添加 FAB 按钮（fixed 定位右下角）

### Step 6：保持现有功能

以下 JS 功能不变，仅更新 DOM 选择器：
- 设备数据加载（`shared/admin-mock-data.js`）
- 搜索过滤
- 状态/点位筛选
- 分页逻辑
- 设备详情弹窗
- localStorage 状态持久化

---

## 五、注意事项

1. **字体回退**：Sora → sans-serif，IBM Plex Mono → monospace
2. **图标方案**：推荐使用 lucide SVG inline，避免额外依赖
3. **零圆角**：所有元素 border-radius: 0，包括按钮、输入框、卡片（FAB 除外，28px 圆形）
4. **数据一致性**：所有设备数据从 `COFE_SHARED_MOCK_DATA` 读取，不硬编码
5. **响应式断点**：沿用项目现有断点体系（1025px / 768px）
6. **侧边栏兼容**：其他页面仍使用 240px 文字侧边栏，仅 devices.html 使用新设计
