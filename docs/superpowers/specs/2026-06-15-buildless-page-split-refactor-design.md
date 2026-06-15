# COFE+ 页面拆分重构（修订：先落地 CSS 安全薄片）

- 日期：2026-06-15
- 状态：**已实现**（CSS 薄片：theme + 页面，2026-06-15）
- 范围：**只抽 CSS、不碰 JS**。把 `menu-management.html` 的内联 `<style>` 外抽为 `<link>`，拆出 `shared/theme.css`（仅 `:root`）+ `pages/menu-management/menu-management.css`（其余，含侧边栏样式，原序不动）。8000 行 JS 深拆**明确推迟**，相关结论存档于第 8 节。

## 0. 实现说明（实际落地，2026-06-15）

落地结果与下文 v2 设计的差异（以本节为准）：

- **最终拆 2 个文件，非 3 个**：经执行期决策，**不抽 `shared/admin-sidebar.css`**——侧边栏 CSS 留在页面 CSS 文件内、保持原始相对顺序，从而彻底消除 §5 所述的非连续重排与 `.selector` 边界风险。下文 §4/§5 中关于 admin-sidebar.css 的内容已被本决策取代。
- **测试影响远超 §6 的"极小"估计**：实际有 **6 个测试文件、约 32 处 CSS 断言**对 menu-management 内联 CSS 做 `html.match(/规则/)`，外抽即破。解决方案是新增 `tests/helpers/page-css.js` 的 `getPageCss(file)`（读取内联 `<style>` + 所有本地 `<link>` 样式表并拼接），把这些断言改为读它——外抽前后皆绿。此助手为未来推广复用。
- **预存测试失败不在本次范围**：基线即有 5 个失败（`login-pages.runtime/structure`、`device-search.location-name`、`pages.font-stack`、`product-detail.pricing`），根因调查证明均为 device-entry/devices/product-detail/login 等**别页的在途功能**所致、与 menu-management 无关，故**保持不动**（只确保不新增失败）。
- **结果**：`menu-management.html` 14,520 → 8,893 行（−38.8%）；全量套件 104 pass / 5 fail（失败集 = 那 5 个预存项，无新增）；关键画面截图与基线逐像素一致；`file://` 双击主题色 `#4ECDC4` 正常解析、无控制台错误。
- **测试命令更正**：CLAUDE.md 写的 `node --test tests/` 在 Node 22 会 `MODULE_NOT_FOUND`，须用 `node --test tests/*.test.js`。

---

## 1. 为什么是这个范围（对抗审查的结论）

初版方案是"试点页优先、纯搬运拆分 menu-management 的 CSS + JS"。四路对抗审查（均用真实代码 + Node `vm` 实验取证）证伪了 JS 侧的核心假设，发现 4 个 blocker，**全部位于 JS**：

- **B1 加载顺序写反**：商品数据区有顶层执行语句（`loadRuntimeDeviceRecords()` @行7037 等 4 处）调用 2300 行后才定义的函数，现仅靠单脚本函数提升才跑通；拆开后 `state.js` 最先加载即 `ReferenceError`（实验证实）。
- **B2 测试网会塌**：现有测试靠"单块字符串 + 22 条 `let→globalThis` 提升 + 贪婪正则"才工作；拆 JS 后宿主侧 `ctx.X` 读写顶层 `let` 失效、贪婪正则静默截断（6 组实验证实）。
- **B3 init 核心区被轻描淡写**：约第 7665–10801 行、216 个函数=全部 45%，是订单预览(51)/拉花(32)/批量改价(29)/设备搜索(11) 等 4+ 子系统泥团，且含全页依赖的渲染原语；初版只给一句"必要时二级拆"。
- **B4 "样板可推广"基本是假的**：推广目标 devices/product-detail/orders 没有试点赖以下刀的 `// ====` 分区（0–1 条 vs 试点 12 条）、有顶层 DOM 绑定副作用、入口名都不统一。

**但对抗审查同时证实：CSS 侧是安全的、确定性最高的。** menu-management 零 `fetch`/XHR/module/绝对路径（`file://` 可开）；单一 `<style>` 块、`url()` 全是 `data:` 内联 SVG、19 个 `:root` 变量各唯一定义无竞争——连初版自列的"url 相对路径风险"在本页都不存在。

**因此本次只做被证实安全的 CSS 薄片，把 JS 深拆作为各页独立任务另行评估。** 仅 CSS 外抽即可让 `menu-management.html` 从 14,520 行降到约 8,900 行（−40%），且因不碰 `<script>`，B1/B2/B3/B4 全部不暴露。

---

## 2. 目标与非目标

**目标：**

1. 把 `menu-management.html` 的内联 `<style>` 外抽为外部 CSS，单文件显著瘦身。
2. 拆出可复用的共享样式层 `shared/theme.css` + `shared/admin-sidebar.css`（本页先用）。
3. 渲染结果**逐像素不变**、行为零变更。

**非目标（本次明确不做）：**

- **不触碰任何 JavaScript**——内联 `<script>` 原样保留（这是 B1/B2 不暴露的关键）。
- 不拆 JS 模块、不动 init 核心区、不改测试装配方式。
- 不改造其余页面（不做跨页推广；其他页的 `:root` 差异见第 5 节，留待各页独立处理）。
- 不引入构建步骤；`file://` 双击仍须可开。

---

## 3. 现状量化（仅列与本次相关者）

| 维度 | 数据 |
|---|---|
| `menu-management.html` 总行数 | 14,520 |
| 内联 `<style>` 范围 | 第 8–5636 行（5,629 行，单块） |
| `<style>` 内 `url()` | 3 处，全为 `url("data:image/svg+xml,…")` 自包含 |
| `:root` 定义 | 仅 1 处（第 9 行），19 个变量（第 11–29 行），各唯一定义、无 @media/`[data-theme]` 重定义、无悬空 `var()` |
| 侧边栏 CSS 分布 | **非连续**：簇 A 第 61–250、页面 CSS 夹心 254–506、簇 B 第 507–560 |
| 内联 `<script>`（不动） | 第 6446–14518 行 |
| `<style>` 块数 / `<base>` 标签 | 1 / 0 |

---

## 4. 范围：CSS 安全薄片

把第 8–5636 行的单个 `<style>` 拆成三份，经 `<link>` 在**原 `<style>` 的文档位置**引入：

```
shared/theme.css                       # :root 19 个主题变量（第 11–29 行）
shared/admin-sidebar.css               # 侧边栏样式（簇 A + 簇 B，含视觉属侧边栏的 .selector）
pages/menu-management/menu-management.css   # 页面专属 CSS（其余全部）
```

`<head>` 中加载顺序（与原 `<style>` 内的相对顺序对齐）：

```html
<link rel="stylesheet" href="shared/theme.css">
<link rel="stylesheet" href="shared/admin-sidebar.css">
<link rel="stylesheet" href="pages/menu-management/menu-management.css">
```

`menu-management.html` 结果：14,520 → 约 8,900 行（HTML 骨架 + 三个 `<link>` + 原封不动的内联 `<script>`）。

---

## 5. 实现注意（直接来自对抗审查取证）

1. **侧边栏 CSS 非连续 → 抽取必然重排，但本页无冲突。** 簇 A(61–250) 与簇 B(507–560) 之间夹着页面 CSS(254–506)；聚成 `admin-sidebar.css` 后，页面夹心会落到全部侧边栏样式之后。对抗审查已穷举全部 8 组重复选择器及 `.selector`，确认两组之间**无同选择器同特异性冲突**，故重排不改渲染。⇒ 安全的根据是"无跨边界冲突"，不是"顺序不变"；**以截图回归为准绳**。
2. **`.selector` 陷阱（手工边界）。** 第 418–448 行 `.selector` 视觉与功能都属侧边栏（深色样式、用于 `.sidebar-selectors`），但其源码行位落在页面夹心区。**必须手工把它划入 `admin-sidebar.css`**，不能按"选择器名是否含 sidebar/nav"机械切分，否则同一控件样式被劈成两个文件。
3. **27 个内联 `style=""` 不动**，它们留在 HTML、特异性最高，不受外抽影响。
4. **`shared/theme.css` 仅对 menu-management 安全。** 其 19 变量来自本页；其他页 `:root` 实测不同（如 staff-management 多 `--danger-light`、缺 `--warning`/`--text-muted`/`--shadow-sm`）。**本次不让其他页引用它**；将来各页采用前须先 diff 自身 `:root`、做并集或保留页面覆盖（见第 8 节推广现实）。

---

## 6. 测试影响（极小）

- **运行时测试不受影响**：它们抽取的是内联 `<script>`（`menu-management.behavior.test.js:17` 的 `/<script>([\s\S]*)<\/script>/`），而本次**不碰 JS**，故 4 个 RUNTIME 文件全部照常通过。这正是只做 CSS 薄片的最大安全红利。
- **需核查的静态测试**：若有测试断言内联 `<style>` 的存在或具体 CSS 规则，需改为断言新的 `<link>`。实现首步先 `grep` 出这类断言并评估（预计很少）。
- **可新增静态断言**：断言三个 `<link href=...>` 存在，反向保护样式加载清单。

---

## 7. 验证策略

- **视觉（首要）**：用 gstack `/browse` 对 menu-management 关键画面（菜单渲染、分类、商品编辑、语言切换、设备切换、侧边栏登录态）做**抽取前后逐屏截图对比**，要求逐像素一致——这是 CSS 外抽是否改级联的唯一可信判据。
- **测试**：`node --test tests/` 全绿。
- **无构建底线**：`file://` 双击 `menu-management.html` 正常加载、样式完整。

---

## 8. 明确推迟的工作（存档对抗审查换来的结论，勿丢失）

以下为 JS 深拆与跨页推广所需的**修正后**做法，本次不实施，但记录在案，供将来逐页独立评估时直接复用：

**8.1 JS 加载顺序——修正模型（替代初版错误的"state.js 最先"）**
- `state.js` 只放**纯声明**；把所有顶层**执行**语句迁出并下沉进 `init()`：商品数据区第 7037/7039/7044/7522 四处 `const …=fn()` / `Object.assign` / `if`，以及 `resize` 监听(6671)、`click` 监听(14498)、`window.onload=init`(14513)、`applyNavLabelsByRole`(14514)。
- 副作用全部收口到 `init()`、由 `window.onload` 最后驱动后，声明型模块之间加载顺序即不敏感。这意味着该步**不是"纯搬运"，需改写**。

**8.2 测试装配——修正做法（替代初版"逐文件 runInContext"）**
- `load-page-modules.js` 应：按 `matchAll(/<script src="([^"]+)"><\/script>/g)` 收集 src → 逐个 `readFileSync` → **拼接成单个字符串** → 复用现有 `let→globalThis` 提升链 → 一次 `runInContext`。
- 提升点会从现有 22 个增至约 82 个（本页顶层 `let` 实测 82 个）；每页各有一批，需逐页重做——故"测试迁移=照搬模板"不成立。

**8.3 init 核心区（约 7665–10801）拆解线**
- 至少拆为：`order-preview.js`(51 fn)、`latte-art.js`(32)、`batch-fixed-price.js`(29)、`device-search.js`(11)、`product-persistence.js`、以及 `render-primitives.js`（`isProductOnSale`/`getProductDescription`/`escapePreviewText`/`renderProductPriceHtml` 等全页依赖枢纽，须早加载）。

**8.4 推广现实（B4）**
- devices/product-detail/orders **无 `// ====` 切割线**，需各自从零做职责划分；devices 有 9 处顶层 `document.getElementById().addEventListener`（违反"只声明"，须改写为延迟绑定）；入口名不统一（product-detail 为 `initPage`）。
- 各页 `:root` 主题变量不一致，采用 `shared/theme.css` 前须逐页 diff。

**8.5 耦合现实**
- 跨区双向循环依赖普遍（render-menu ⇄ init 调 40/15 次，product ⇄ init 调 45/8 次）。物理拆文件**不消除**逻辑横跳，可维护性收益有上限——若追求真正解耦需额外设计，不在"纯搬运"范畴。

---

## 9. 风险与对策（本次薄片）

| 风险 | 对策 |
|---|---|
| 侧边栏 CSS 重排改变渲染 | 已验证本页无跨边界选择器冲突；以逐屏截图回归为闸 |
| `.selector` 等"视觉属侧边栏、行位属页面"被误切 | 手工判定边界（第 5.2 节），按视觉/功能归属而非选择器名 |
| 静态测试断言了内联 CSS | 实现首步 grep 出来，改断言 `<link>` |
| `file://` 相对路径 | 全用相对路径并显式双击验证 |
| 误碰 JS | 纪律：本次 PR 不允许任何 `<script>` 内容变更，diff 审查把关 |

---

## 10. 成功标准

- `menu-management.html` 从 14,520 行降至约 8,900 行（−40%），内联 `<script>` **逐字未变**。
- 产出 `shared/theme.css`、`shared/admin-sidebar.css`、`pages/menu-management/menu-management.css` 三个文件。
- 关键画面截图抽取前后逐像素一致；`node --test tests/` 全绿；`file://` 双击正常。
- 第 8 节存档完整，作为未来 JS 深拆与推广的依据。
