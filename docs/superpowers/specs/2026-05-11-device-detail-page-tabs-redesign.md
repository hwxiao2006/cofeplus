# 设备详情页 Tabs 重构

- **日期**: 2026-05-11
- **模块**: device-mgmt · `devices.html`(详情页部分)
- **基线**: `origin/main` @ d3a2b22,分支 `feat/restart-split-button`(已 commit Task 1:split button CSS)
- **上游决策**: 把早期 [2026-05-11-device-restart-entry-redesign] spec 收编为本 spec 的子部分;不再单独实施那份 spec 的 Task 2-6

## 背景

设备详情页当前是"主列 8 张卡片 + 右侧 300px 操作栏"的单屏瀑布式布局。痛点:

- **信息密度/层级混乱** · 8 张卡片按"设备概览 → 状态 → 运营摘要 → 技术 → 入场 → 广告屏 → 状态记录 → 维护记录"顺序堆叠,没有场景分组,用户要找某一类信息就得滚屏翻找
- **运营数据混在设备页** · 订单数、销售额等本属于 orders.html 的维度,却挤在详情页,既冗余又让详情页焦点涣散
- **重启等高频操作被埋** · 见 2026-05-11-device-restart-entry-redesign spec

## 目标

把详情页改造为 **"置顶头 + Tabs"** 结构,信息按场景分 5 个独立视图,每个 tab 一屏看完一件事。

不在范围:订单/销售额/库存统计不进详情页(去 orders.html / materials.html)。

## 设计

### 整体结构

```
┌──────────────────────────────────────────────────────┐
│  ‹  RCK386  ● 运行中  · 广州广交会A区       ⟳重启▾ 远程 ⋯  │ ← 置顶头
├──────────────────────────────────────────────────────┤
│  [概览] [运行] [记录] [入场] [广告屏]                  │ ← Tabs
├──────────────────────────────────────────────────────┤
│                                                      │
│   当前 tab 内容(双栏或满宽卡片)                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 置顶头(`.detail-top-head`)

| 元素 | 内容 |
|---|---|
| 返回 | ‹ 返回设备列表 |
| 设备 ID | 18px / 700 `#0f172a` |
| 状态胶囊 | 根据 `summary.statusName` 渲染(运行中/停卖/异常) |
| 入场胶囊 | 根据 `summary.entered` 渲染(已入场/未入场) |
| 点位 | `summary.locationName` + 点位类别 |
| 快捷操作 | **重启 split button**(复用 Task 1 的 `.detail-side-restart-*` 类)+ 远程操作(蓝)+ ⋯ 更多 |

split button 从侧栏移到头部 — Task 1 的 CSS 完全复用,只改 HTML 挂载点和 `.detail-side-restart-split` 用于行内的 padding/尺寸微调(可能需要加 `.in-head` 变体)。

### Tabs(`.detail-tabs`)

```
[概览] [运行] [记录] [入场] [广告屏]
```

- 激活态: teal `#0f766e` + 2px 下划线 + 700 字重
- hover: 文字变 teal,无下划线
- Tab 状态同步到 URL hash(如 `#tab=run`),便于刷新 / 分享保留当前 tab

### Tab 1: 概览(默认)

双栏布局:
- **左 · 基本信息卡** — 字段来自 `summary`:
  - 设备编号 `deviceId` / 设备类别 `category` / 点位 `locationName` / 入场状态 / 运营模式
- **右 · 当前状态卡** — 字段来自 `summary` + `fault`:
  - 运行状态 `statusName` / 停卖状态 `salesName` / 最近心跳 `heartbeat` / 当前异常摘要 `buildDeviceAbnormalSummary(snapshot)` / 异常更新时间 `snapshot.updatedAt`

概览 tab **不包含**订单/销售/库存统计。

### Tab 2: 运行

顶部 4 瓦片(温湿度快速读):
- 冰箱温度 `fridgeTemp` / 豆仓温度 `beanTemp` / 制作仓温度 `craftTemp` / 豆仓湿度 `beanHumidity`

下方:
- **软件/固件卡** — `upperSoftware / orderSoftware / orderSystem / orderKernel / adVersion / firmwareVersion / updatedAt`(全部来自 `renderTechnicalStatusCard` 的 snapshot)
- **运营参数卡** — `paymentMethods / energyMode / networkSignal`(从 `renderDeviceOperationSummaryCard` 的 `entryData.info` 移来)
- **机构状态 chips 条** — `orgStatus[]` 数组渲染成 pill 列表,状态枚举 `normal / lost / fault`,复用 `.detail-fault-chip.normal / .lost / .fault` 样式
- **温度报警设置卡** — 来自 `buildDetailTemperatureAlarmZones`,3 个 preset(冰箱/豆仓/制作仓),各自显示温度报警、湿度报警、存储温度等

### Tab 3: 记录

双栏:
- **状态记录** — `renderDetailRecordsCard` 的数据,时间轴样式(时间 · 点 · 文本 · 副说明)
- **维护记录** — `renderDetailMaintenanceCard` 的数据,同样时间轴

每侧带"筛选 ▾"和"全部 N 条"链接。

### Tab 4: 入场

- **合约信息** — `entryData.info` 字段(入场状态、入场日期、合约类型、联系人、联系电话、合约到期等)
- **当前点位** — `entryData.locationName` + 点位类别 + 楼层/位置
- **点位变更历史**(跨两栏)— `info.locationChangeRecords[]`,时间轴样式

### Tab 5: 广告屏

- **左/右屏预览瓦片** — 16:9 占位(后续可接真实截图),显示"左屏/右屏 · 当前播放素材名 · 分辨率 · 时长"
- **播放计划卡** — 播放模式 / 活跃时段 / 素材数 / 下次切换
- **素材审核卡** — 待审核 / 已通过 / 已驳回 / 本月上传

> 注:广告屏 tab 的字段主要对应 `renderDetailAdScreenCard` 和 `entryData.info.adScreen`。若 main 上某些字段还没有,第一版用占位符,并在 plan 里单独标注为 TODO,不在本次范围内新增后端字段

### 移动端适配

断点 `max-width: 768px`:
- 置顶头拆两行(第一行 ID + 状态胶囊,第二行点位)
- 操作按钮条独立占一行,「重启」主按钮占 50% 宽
- Tabs 横向滚动(`overflow-x: auto`,隐藏滚动条)
- Tab body 单列堆叠,每个 sec-card 占满宽度
- split button 的 ▾ popover 在手机上变 **bottom sheet**(从底部上弹),复用 `openDetailRemoteActions` 现有 sheet 样式

### 保留的现有函数 / 函数去向

| 现有函数 | 新用途 |
|---|---|
| `renderDeviceOverviewCard` | → [概览] tab 左栏 "基本信息" 内容源 |
| `renderDeviceStatusCard` | → [概览] tab 右栏 "当前状态" 内容源。去掉 recoveryAction(Task 1 后续 plan 中已处理) |
| `renderDeviceOperationSummaryCard` | → 拆分:`paymentMethods/energyMode/networkSignal` 搬到 [运行] tab "运营参数卡";其它字段并入 [入场] tab |
| `renderTechnicalStatusCard` | → [运行] tab 多块(温湿度瓦片 + 版本卡 + orgStatus chips) |
| `buildDetailTemperatureAlarmZones` | → [运行] tab 温度报警设置卡 |
| `renderDetailRecordsCard` | → [记录] tab 左栏 |
| `renderDetailMaintenanceCard` | → [记录] tab 右栏 |
| `renderDetailEntryInfoCard` | → [入场] tab |
| `renderDetailAdScreenCard` | → [广告屏] tab |
| `openDetailRestartSystem` / `openDetailRestartPart` / `toggleDetailRestartPopover` | 保持,只改 DOM 挂载点从侧栏→头部 |
| `openDetailRemoteActions` | 变成头部 "远程操作" 按钮的 onclick 目标 |
| `openDetailTemperatureAlarmModal` | 在 [运行] tab 的 "温度报警设置" 卡上加 "编辑" 链接,触发 |
| `openDetailStatusRecords` / `openDetailEditFaultStatus` | 收到 [概览] / [记录] 的 "⋯ 更多" 下拉菜单中 |
| `goToDeviceMaterials` / `openDetailInfoPanel` | 收到头部的 "⋯ 更多" 下拉菜单 |

### 移除的元素

- 旧 `.detail-layout` 双列容器(1fr + 300px)
- 旧 `.detail-side-*` 右侧操作栏(按钮全部迁到头部/更多菜单/tab 内 action)
- 旧 `.detail-grid` 瀑布式主列
- 旧 `renderDeviceStatusCard` 里 Task 1 spec 中提到的 `recoveryAction` 片段

## 测试策略

**单元测试**(regex 静态 + VM 运行时,项目现有模式):

- `tests/devices.detail-tabs.test.js` — 静态:头部 DOM、tabs 结构、每个 tab 对应的 render 函数被挂到正确 tab 容器
- `tests/devices.detail-tabs.runtime.test.js` — 运行时:`switchDetailTab(tabKey)` 切换 active 状态、hash 更新、tab body 切换
- 每 tab 独立测试:`tests/devices.detail-tab-overview.test.js`、`...-run.test.js`、`...-records.test.js`、`...-entry.test.js`、`...-adscreen.test.js`
- 已有的 `devices.restart-split-button.test.js` 更新:断言 split button 在**头部**而非侧栏

**回归测试**:基线 4 个 known-failing 测试保持不变(login/font-stack/device-search 与本改动无关)。其他测试应全绿。

## 风险

- **数据改造多点但无新字段** — 所有数据复用 main 已有字段,不接触后端。风险点是 render 函数拆分时逻辑搬运出错。每 tab 独立测试可控制。
- **URL hash 同步** — 若 hash 与 tabs 不一致(外部跳链接),需要兜底(默认 概览)
- **Task 1 的 split button 要迁移** — CSS 不改,HTML 挂载点和测试断言要改,需要单独 commit

## 不在范围

- 订单/销售/库存的聚合卡
- 实时事件时间线(方向 C 的 dashboard 风格)
- KPI 数字卡
- 新后端字段
- 广告屏真实截图接入(本 spec 用占位)
