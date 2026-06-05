# 配方入口方案B实施规格

**日期**: 2026-05-28
**状态**: 已实施，需验证
**关联页面**: `recipe-entry-preview.html`（方案对比预览页）、`product-detail.html`（商品详情页）

## 背景

原始配方修改路径为 6 步：菜单管理 → 商品管理 → 点击商品 → 商品详情 → 配方配置 tab → 修改配方。方案B将配方配置从二级 tab 提升为一级 tab，减少操作步骤。

## 已实施的改动

### 1. Tab 栏从 2 个扩展为 3 个

**文件**: `product-detail.html` ~L2840

```
基本信息 | 🧪 配方配置 | ⚙️ 选项配置
```

原状态：只有"基本信息"和"配方配置"两个 tab。

### 2. 新增「选项配置」独立 tab 面板

**文件**: `product-detail.html` ~L2904 `#productDetailTagsPanel`

内容包含：
- **选项配置区** — 8 个选项卡（咖啡豆、温度、浓度、糖浆、甜度、杯型、杯盖、拉花），原在 `#recipeHiddenOptions` 隐藏区域中
- **编辑多语言文案按钮** — 调用 `openTagConfigDrawer('beans')` 打开标签配置抽屉，编辑选项的多语言名称

### 3. 业务标签归还基本信息 tab

业务标签（`productBusinessTagEditBtn`、`productBusinessTagSummary`）保留在基本信息 tab 的表单卡片内，未移走。

### 4. 配方 tab 改为内联编辑模式

**文件**: `product-detail.html` `#productDetailRecipePanel`

配方配置 tab 内容从旧的 toolbar+选项卡模式改为内联杯型卡片编辑器：
- 顶部显示标题「配方配置 · 直接调整各杯型成分」和「保存配方」按钮
- 内容区 `#recipeInlineBody` 由 JS 动态渲染

#### 核心函数

| 函数 | 位置 | 职责 |
|------|------|------|
| `renderInlineRecipe()` | ~L7089 | 入口函数。检查 productData → 调用 `ensureMockRecipes()` → 调用 `getCupVariants()` 获取杯型变体 → 构建 `recipeEditorState` → 调用 `renderRecipeEditorInline()` |
| `renderRecipeEditorInline()` | ~L7115 | 渲染杯型卡片网格到 `#recipeInlineBody`。每个卡片包含：成分填充条（cup-fill-track）、配置总量/标准杯量对比、参数标签、活跃卡片的滑块编辑行 |
| `getCupVariants()` | ~L5368 | 从温度和杯型选项卡中读取选项，交叉组合生成变体列表。热的用第一个杯型，冰的用第二个 |
| `setActiveCup(idx)` | ~L5404 | 切换活跃杯型卡片，更新 `recipeEditorState.activeIndex` 并重新渲染 |
| `onCupSlider(el)` | ~L5410 | 滑块拖动回调，更新对应成分的 ml 值并重新渲染 |
| `onCupInput(el)` | ~L5421 | 数值输入回调，校验范围 0-500 后更新 ml 值并重新渲染 |
| `saveRecipeEditor()` | ~L5657 | 保存配方（原有函数，未修改）。遍历所有杯型变体持久化到 localStorage |

#### 杯型卡片渲染逻辑

`renderRecipeEditorInline()` 为每个变体生成一张卡片：

1. **成分填充条** — 遍历 `RECIPE_COMP_CONFIGS`（浓缩E、奶M、奶泡F、水W、冰I 等），按 ml 比例渲染色段
2. **总量对比** — 显示「配置总量」vs「标准杯量」，超出时红色警告
3. **参数标签** — 每种成分的名称和 ml 数值
4. **编辑行**（仅活跃卡片） — 每种成分一行：标签 + range 滑块（0-500） + number 输入框，带 `oninput="onCupSlider(this)"` 和 `onchange="onCupInput(this)"`

#### 数据流

```
switchProductDetailTab('recipe')
  → renderInlineRecipe()
    → ensureMockRecipes()          // 确保配方 mock 数据存在
    → getCupVariants()             // 从 HTML 选项卡读取温度×杯型组合
    → getOptionRecipe()            // 获取每个变体的配方（成分分组+ml值）
    → recipeEditorState = { variants, activeIndex: 0 }
    → renderRecipeEditorInline()   // 渲染 cup-grid 卡片到 #recipeInlineBody
```

#### 配方数据结构

`recipeEditorState.variants[i].recipe` 结构：
```js
{
  groupOrder: ['baseCoffeeLiquid', 'syrup', 'milk', 'foam', 'water', 'ice', ...],
  groups: {
    baseCoffeeLiquid: { names: [], percent: 100, ml: 80 },
    milk:             { names: [], percent: 100, ml: 180 },
    ...
  }
}
```

成分颜色配置在 `RECIPE_COMP_CONFIGS`（~L3579）：
- E（浓缩）→ `#7a5c2e`
- M（奶）→ `#d4b896`
- F（奶泡）→ `#e0d4b0`
- W（水）→ `#5bbfb5`
- I（冰）→ `#7cc4db`

### 5. JS 函数修复

**问题**: 原有未提交代码中 `renderInlineRecipe` 函数有截断字符串（`body.innerHTML = '<`），导致整个 `<script>` 块解析失败，所有函数变为 undefined。

**修复**: 
- 恢复独立的 `fillFormData()` 函数（~L7029），负责填充商品表单数据（图片、价格、状态、业务标签、选项默认值）
- 重写 `renderInlineRecipe()`（~L7089）为完整实现
- 新增 `renderRecipeEditorInline()`（~L7115）函数，复用 `renderRecipeEditor()`（~L5280）的卡片渲染逻辑但输出到 `#recipeInlineBody`

### 6. Tab 切换逻辑更新

**文件**: `product-detail.html` `switchProductDetailTab()` 函数

- 新增 `tags` tab 处理：`isTags` 状态、`tagsBtn`/`tagsPanel` 元素引用、active/aria-selected 切换
- 支持 URL 参数 `?detailTab=tags` 直接打开选项配置 tab

### 7. 移动端响应式

**文件**: `product-detail.html` 响应式 CSS

移动端 tab 栏 grid 从 `repeat(2, ...)` 改为 `repeat(3, ...)` 适配三个 tab。

### 8. 复制工作流兼容

复制工作流激活时，整个 `.product-detail-tabs` 被隐藏（`display: none`），三个 tab 都不可见，由复制步骤条接管导航。无需额外处理。

## 需要验证的内容

1. **从菜单管理进入商品详情** — 通过正常流程（菜单管理 → 商品管理 → 点击商品）进入商品详情，确认三个 tab 都正常切换
2. **配方内联编辑** — 切换到配方配置 tab，确认杯型卡片渲染、滑块调整、保存功能正常
3. **选项配置 + 多语言编辑** — 切换到选项配置 tab，点击"编辑多语言文案"按钮，确认标签配置抽屉正常打开
4. **业务标签** — 在基本信息 tab 中，确认业务标签编辑功能正常（编辑按钮、标签摘要显示）
5. **复制工作流** — 在复制模式下确认 tab 栏正确隐藏，复制步骤条正常工作
6. **移动端** — 在 375px 宽度下确认三个 tab 都可见且可点击

## 已知问题

- `tests/product-detail.pricing.test.js` 中有一个断言失败：检查旧的 `openRecipeEditorBtn` 按钮是否存在。这是预存在的未提交更改导致的（配方面板从旧 toolbar 改为内联编辑），与方案B无关。
- `renderInlineRecipe` 依赖 `getCupVariants()` 返回杯型变体数据。直接访问 `product-detail.html`（不通过菜单管理跳转）时没有 `productData`，配方 tab 会显示空状态。

## 未改动的功能

以下功能逻辑完全未动：
- 选项卡 click 事件绑定（`initPage` 中的 `.option-list` 和 `.option-card` 事件监听）
- `refreshOptionListLabels()` / `ensureTagI18n()` / `syncSelectedOption()` 等选项刷新函数
- `openTagConfigDrawer()` / `renderDrawerEditor()` 标签配置抽屉功能
- `openRecipeEditor()` / `renderRecipeEditor()` 配方编辑器弹窗功能
- `saveProduct()` 商品保存逻辑
- 业务标签相关函数（`renderProductBusinessTagSummary`、`openProductBusinessTagEditor` 等）
- 复制工作流逻辑
- `shared/tag-group-i18n.js` 和 `shared/admin-mock-data.js`
