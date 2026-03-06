# 侧边栏头部统一对齐设计

## 背景
当前多页后台原型都使用同款左侧菜单，但 `Prototype v0`、登录名/电话、`运营管理` / `基础信息管理` 的左边缘并不统一。`overview.html` 已经补过登录信息，但它的头部对齐规则与其他页面分离，后续继续微调时容易再次跑偏。

## 目标
- 让 `Prototype v0`、登录名、电话、`运营管理`、`基础信息管理` 共享同一条左对齐竖线。
- 在 11 个带同款侧栏的页面中统一这套规则：`overview.html`、`menu.html`、`menu-management.html`、`devices.html`、`orders.html`、`materials.html`、`faults.html`、`customers.html`、`locations.html`、`staff-management.html`、`product-detail.html`。
- 保持现有视觉风格、导航结构、激活态、移动端逻辑不变。

## 已确认方案
用户已确认采用“统一侧栏对齐变量”的方案：
- 在侧栏根节点上定义统一横向变量。
- `sidebar-header`、`sidebar-nav`、`nav-section-title` 都引用这些变量。
- `brand-version` 与登录信息通过统一公式与 section title 左边缘对齐。
- 对没有登录信息的页面，不新增业务信息，只统一现有头部元素的对齐。

## 结构设计
1. 在每个同款侧栏页面的 `.sidebar` 上定义：
   - `--sidebar-header-padding-x`
   - `--sidebar-nav-padding-x`
   - `--sidebar-section-title-padding-x`
2. `.sidebar-header` 使用 `--sidebar-header-padding-x` 作为横向内边距。
3. `.sidebar-nav` 使用 `--sidebar-nav-padding-x`。
4. `.nav-section-title` 使用 `--sidebar-section-title-padding-x`。
5. `.brand-version` 与 `.sidebar-login` 的左边距统一为：
   - `calc(var(--sidebar-nav-padding-x) + var(--sidebar-section-title-padding-x) - var(--sidebar-header-padding-x))`
6. `overview.html` 继续保留现有登录信息节点，仅切换到统一对齐公式。

## 样式策略
- 不重做侧栏视觉，仅修正横向基准。
- 保留 `Prototype v0` 当前字号、颜色和弱强调语气。
- 登录信息继续保持低调紧凑，不抢导航权重。
- 通过变量避免每页写死 `padding-left` 数值，减少后续维护成本。

## 兼容与边界
- `product-detail.html` 的侧栏虽然不是主导航页，但头部结构相同，纳入统一规则。
- 登录名/电话仅在 `overview.html` 保留；其余页面若当前没有该节点，不额外扩展范围。
- 现有脚本、跳转、侧栏开关、移动端适配保持不变。
- 不处理与本次需求无关的既有样式差异。

## 验收标准
- 在 11 个目标页面中，`Prototype v0` 与 section title 视觉上共享同一条左对齐竖线。
- `overview.html` 中登录名与电话也落在同一条竖线上。
- 相关测试通过，且不引入新的结构性回归。
