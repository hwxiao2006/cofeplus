# 商品详情图片与选项分组排序工程 Spec

## 目标

完成商品管理的两项能力，并确保编辑页、未保存的点单屏预览、保存后的点单屏预览行为一致：

1. 商品详情页支持独立详情图片；未设置时持续使用列表页图片。
2. 商品选项分组支持与分类导航一致的拖拽排序，支持鼠标和触屏。

产品 PRD：

- [Markdown PRD](../../../tasks/prd-product-detail-images-option-group-order.md)
- [浏览器版 PRD](../../../tasks/prd-product-detail-images-option-group-order.html)
- [线上 PRD](https://prd.cofeplus.dpdns.org/tasks/prd-product-detail-images-option-group-order.html)

## 当前代码范围

主要文件：

- `product-detail.html`：商品编辑页、图片输入、选项配置导航、草稿预览 payload。
- `menu-management.html`：点单屏预览接收草稿、商品卡片图片、商品详情图片和选项分组渲染。
- `tests/product-detail.images-order.test.js`：图片、排序、草稿传递和拖拽边界的 VM/结构测试。
- `tests/prd-product-images-option-order.test.js`：PRD 源文件、截图、站点入口的回归测试。

当前工作区已经有一版本地实现。执行前必须先阅读 `git diff`，保留已经正确的实现，修复缺口并补充测试；不要用基线文件覆盖现有改动。

## 数据契约

### 商品字段

在商品对象上使用以下字段：

```js
{
    image: string | null,
    detailImage: string | null,
    optionGroupOrder: string[] | null
}
```

- `image` 继续作为商品列表图。
- `detailImage` 为空字符串、`null` 或缺失时表示“跟随 `image`”；读取详情图片时使用 `detailImage || image`。
- `optionGroupOrder` 是选项分组 `specKey` 的数组。缺失、空数组、重复键、未知键都要通过规范化处理；最终顺序必须包含所有当前有效分组且每个只出现一次。旧商品的默认顺序保持当前点单屏顺序：`beans`、`syrup`、`sweetness`、`temperature`、`strength`、`cupsize`、`lid`、`latteArt`。
- 不能因为预览而写入 `localStorage`；只有明确保存商品或保存选项配置时才持久化。

### 草稿 payload

详情页构造点单屏草稿时传递 `detailImage` 和 `optionGroupOrder`。菜单页规范化 payload 时保留两个字段；接收草稿时只覆盖当前商品对应字段，不污染其他商品。

## 功能要求

### 1. 列表图与详情图

- 基本信息页并排展示“列表页图片”和“详情页图片”；小屏时纵向排列。
- 详情图片输入支持 URL 和本地图片上传，沿用现有图片校验：图片类型必须是 image，大小不超过 6MB。
- 详情图为空时显示列表图预览，并明确显示“当前跟随列表页图片”。
- 详情图有值时显示独立详情图，并提示修改列表图不会影响详情图。
- “使用列表页图片”清空独立详情图字段并立即恢复跟随关系。
- 修改列表图：跟随状态下详情图同步变化；独立状态下详情图不变化。
- 列表图继续用于点单屏商品列表卡片；详情图优先用于点单屏商品详情页。
- 图片加载失败必须保留输入可编辑，并显示现有错误提示，不得抛出未处理异常。

### 2. 选项分组拖拽排序

- 选项配置左侧导航继续使用分组名称作为编辑对象入口。
- 每个分组使用与分类导航一致的 `⠿` 拖拽手柄、`draggable` 行和虚线落点占位。
- 点击分组名称只切换编辑对象；拖拽手柄负责排序，拖拽不能意外切换当前编辑对象或清空未保存文案。
- 支持桌面鼠标拖拽和触屏手柄拖拽；支持拖到首位、末位以及跨越多个分组。
- 拖拽经过目标行时，根据目标行上下半区把占位放到目标前或目标后。
- 正常释放后更新当前商品草稿中的 `optionGroupOrder`，清理占位并重新渲染导航；不自动持久化。
- 鼠标拖动取消、触屏 `touchcancel` 或无效落点必须恢复原顺序并清理拖动状态。
- 分组顺序变化不能影响组内选项、文案、默认项、附加价、隐藏/不可用状态或当前选中的编辑分组。
- 键盘可选但推荐保留现有实现：分组获得焦点后使用 Alt + ↑ / ↓ 调整相邻顺序，首尾不越界且焦点保留。
- 不再显示上下箭头排序按钮。

### 3. 点单屏预览

- 编辑页点击“预览点单屏”时，图片与排序使用当前草稿，即使尚未保存。
- 点单屏商品列表卡片使用 `image`。
- 点单屏商品详情使用 `detailImage || image`。
- 点单屏商品详情的选项分组按 `optionGroupOrder` 渲染；缺失或非法顺序回退到默认顺序。
- 关闭预览回到编辑页后，草稿仍在；预览过程不能触发保存。
- 保存商品后重新打开商品和预览，两个字段都要保留。
- 预览语言切换、分类切换、选项状态切换不能破坏图片和分组顺序。

## 实现约束

- 遵循仓库现有的单文件 HTML、内联 CSS/JS 结构，不引入构建工具或第三方依赖。
- 复用分类导航已有拖拽行为和视觉语言，避免再实现一套不一致的排序控件。
- 保留现有 `localStorage` key 和商品保存流程。
- 不修改真实设备发布、刷新点单屏或商品分类排序逻辑。
- 处理当前工作区中与本需求无关的未跟踪文件时保持原样，不删除用户素材。

## 测试要求

必须先运行新增/相关测试，再运行全量测试：

```bash
node --test tests/product-detail.images-order.test.js
node --test tests/prd-product-images-option-order.test.js
node --test tests/product-detail.option-status.runtime.test.js tests/menu-management.option-status.runtime.test.js tests/menu-management.behavior.test.js
node --test tests/*.test.js
```

至少覆盖：

- 旧商品无新字段时的跟随图片和默认排序。
- 独立详情图覆盖与恢复跟随。
- 草稿 payload 的字段传递和预览隔离。
- 列表图/详情图在点单屏不同位置的渲染。
- 鼠标拖拽正常落位、取消拖拽、触屏拖拽和 `touchcancel`。
- 拖拽后当前编辑分组及未保存文案不变。
- 非法、重复、缺失分组键的规范化。
- 结构测试确认不再渲染上下箭头，且存在拖拽手柄、占位和触屏监听。

现有全量测试若有与本需求无关的基线失败，需在结果中区分“本次回归通过”和“既有失败”，不得通过删改无关测试来消除失败。

## 浏览器验收

启动：

```bash
python3 scripts/no_cache_http_server.py --port 8080
```

验证以下流程：

1. 打开商品详情基本信息，确认详情图为空时显示列表图。
2. 输入或上传详情图，确认列表图不变、详情图独立变化。
3. 点击“使用列表页图片”，确认恢复跟随。
4. 进入选项配置，拖动中间分组到首位和末位，确认虚线占位和最终落位。
5. 拖动后点击其他分组，确认编辑对象切换正常；拖动不会丢失已有输入。
6. 不保存直接预览，确认列表页图片、详情页图片和分组顺序均使用草稿。
7. 保存后刷新并重新打开，确认图片关系和分组顺序保留。
8. 在窄屏视口验证图片纵向布局和触屏拖拽。

## GitHub 同步

- 当前功能分支：`codex/product-images-option-order-preview`。
- 执行 agent 必须在完成代码和测试后查看 `git status`、`git diff --check`，并提交一个聚焦本需求的 Conventional Commit。
- 将当前功能分支推送到 `origin`，不要直接推送或改写 `main`。
- push 前确认提交包含代码、测试和必要的 spec/PRD 源文件，不包含临时日志、缓存、运行产物或敏感信息。
- 最终报告提交哈希、远程分支、测试结果和仍存在的基线失败；如果远程分支不存在，使用 `git push -u origin codex/product-images-option-order-preview`。
- 如果 push 被拒绝，先报告具体原因；不要强制推送、重置或覆盖远程历史。

## 完成标准

代码、测试、浏览器验收和 GitHub 分支同步全部完成后，执行 agent 才能报告完成。任何一项未完成都要明确列出阻塞原因和已尝试步骤。
