# Handoff：商品详情图 + 选项分组拖拽排序 — Review 交接

> 写于 2026-09-10。目的：reviewer 凭本文档即可拉到代码、跑起来、复现全部验收流程，无需回溯对话历史。
> 状态：功能已完成、测试通过、浏览器验收通过，分支已推送，等待 review。

## 一、这是什么变更

商品管理两项能力（产品 PRD：`tasks/prd-product-detail-images-option-group-order.md`）：

1. **商品详情页独立图片**：详情图默认跟随列表图；可设独立详情图；点单屏商品列表卡片用列表图、商品详情用 `detailImage || image`。
2. **选项分组拖拽排序**：商品编辑页选项配置左侧导航，支持鼠标 + 触屏拖拽（⠿ 手柄、虚线占位、按目标行上下半区落位）、Alt+↑/↓ 键盘排序；排序只进当前商品草稿，保存时才持久化。
3. **点单屏预览一致性**：未保存的图片与排序通过草稿 payload 传入嵌入预览，预览不写 localStorage。

## 二、代码在哪里

| 项 | 值 |
|---|---|
| 分支 | `codex/product-images-option-order-preview`（已推送，本地与 origin 一致） |
| 提交 | `a7ebf6a feat(menu): add detail images and option group ordering`（单提交，20 文件，+845/−10） |
| 线上分支预览 | https://codex-product-images-option.cofeplus.pages.dev |
| 线上提交快照 | https://84fc9102.cofeplus.pages.dev |
| 工程师 spec | `docs/superpowers/specs/2026-09-09-product-images-option-order-spec.md` |
| 实施计划 | `docs/plans/2026-09-09-product-images-option-order-plan.md` |

注：该分支最初在另一个工作区实现并推送；2026-09-10 会话在本仓库（`/Users/mac/cofeplus/cofeplus`，同一 GitHub 远程）检出，逐条对照 spec 做了代码审查、全量测试与浏览器验收，未发现功能缺口，无追加提交。

## 三、数据契约（review 前速览）

商品对象新增两个字段：

```js
{
  image: string | null,             // 列表图，原有字段
  detailImage: string | null,       // ''/null/缺失 = 跟随 image
  optionGroupOrder: string[] | null // 分组 specKey 数组；非法/重复/缺失键经规范化补齐
}
```

- 默认顺序（旧商品回退）：`beans, syrup, sweetness, temperature, strength, cupsize, lid, latteArt`。
- 持久化走既有 `menuProductEdits` 流程；预览只传草稿、不落盘。

## 四、逐文件改动

### `product-detail.html`（核心，+329 行）

- **编辑页表单**（约 3834–3861 行）：`product-image-fields` 双列布局（≤900px 纵向堆叠），“列表页图片”与“详情页图片”并排；详情图支持 URL + 本地上传（复用 `handleProductImageFileChange`，第二参数指定目标 input，沿用 6MB/图片类型校验）；“使用列表页图片”按钮清空详情图恢复跟随。
- **预览联动**：`updateDetailImagePreview()`（约 9812 行）按有无独立详情图渲染预览和状态文案（“当前跟随列表页图片…”/“使用独立详情图…”）；`updateImagePreview()` 内调用它，保证改列表图时跟随态同步、独立态不动；`img.onerror` 显示错误文案不抛异常。
- **排序规范化**：`normalizeOptionGroupOrder()`（约 4678 行）——合法键白名单（`tagConfigs`）、去重、未知键丢弃、缺失键按默认顺序补齐，保证输出恒为当前全部分组的一个排列。
- **拖拽实现**（约 9911–10128 行）：
  - 鼠标：行级 `draggable` + `dragstart/dragover/drop/dragend`；占位插入位置由目标行中点上下半区决定；`dragend` 无 `drop`（Esc 取消/拖出）→ `resetOptionGroupDragState()` 恢复原顺序。
  - 触屏：`touchstart` 绑在手柄上（`passive:false` + `preventDefault`，避免滚动抢占），`touchmove/touchend/touchcancel` 绑在 document（`ensureOptionGroupTouchListeners()` 只绑一次）；`touchcancel` 走恢复分支。
  - 提交：`commitOptionGroupDrag()` 把拖拽行插到占位处 → `saveOptionGroupOrderByDom()` 校验 DOM 顺序确为全部分组的一个排列才写入 `productData.optionGroupOrder` → 清状态 → `renderTagTree()` 重绘。
  - 防误触：提交后 `optionGroupIgnoreClickUntil = Date.now()+500`，抑制落位重绘引发的意外点击切换分组；点击分组名走 `selectOptionGroup()` 只做 `switchDrawerTag`。
  - 键盘（保留项）：分组按钮 `Alt+↑/↓` 调相邻位，首尾不越界，重绘后焦点回到该分组。
- **草稿与保存**：`collectProductDraftForSave()` 与 `buildOrderPreviewDraftPayload()` 均带上 `detailImage`（input 值 trim，空即 null）和 `optionGroupOrder`（规范化后）。加载商品时 `productDetailImage` input 回填 `productData.detailImage`。

### `menu-management.html`（预览端，+38 行）

- `normalizeOrderPreviewOptionGroupOrder()`（约 9926 行）：与编辑页同构的规范化，合法键来自 `ORDER_PREVIEW_DETAIL_SECTION_CONFIG`。
- `normalizeOrderPreviewDraftPayload()`：保留草稿中两字段（`detailImage` 用 hasOwnProperty 判定“是否携带”，避免 undefined 误清）。
- `getOrderPreviewDisplayProduct()`（约 9997 行）：**仅当 `product.id === draft.productId` 才合并草稿字段**——这就是“不污染其他商品”的实现点。
- 渲染：列表卡片继续用 `product.image`（约 10903 行）；详情图改用 `product.detailImage || product.image`（约 10694 行）；`renderOrderPreviewDetailSections()` 按 `optionGroupOrder` 输出分组（约 10649 行）。

### 测试（新增 2 个文件）

- `tests/product-detail.images-order.test.js`（6 子测试）：结构断言（手柄/占位/触屏监听存在、无上下箭头按钮）、默认排序与异常键规范化、跟随/独立/恢复行为、草稿传递与不落盘、拖拽取消与 touchcancel、拖动提交的 DOM 重排。
- `tests/prd-product-images-option-order.test.js`（2 子测试）：PRD 源文件配对、截图引用、站点入口。

### 其余

spec/plan/PRD 源文件、`scripts/prd_site_index.html` 入口、11 张验收截图。无其他页面改动。

## 四·五、Review 往复记录（2026-09-10）

首轮 review 提出 Important #1：**松手在虚线占位/行间隙上等于取消拖拽**。已修复（提交 `24b1bba`）：

- 根因：`drop` 只绑在分组行上；占位 div 是 `pointer-events:none`，行间隙的命中目标是 `#tagTree` 容器，两者都没有 `dragover preventDefault`，浏览器不派发 `drop`，只走 `dragend` 一律重置。
- 修法（reviewer 建议方案一）：新增树级 `handleOptionGroupTreeDragOver`/`handleOptionGroupTreeDrop`（绑在 `#tagTree` 容器，`ensureOptionGroupTreeListeners()` 只绑一次）；`handleOptionGroupDragEnd` 改为仅在 `optionGroupDraggedElement` 仍非空（即没有任何 drop 提交过）时重置——**保留 Esc/拖出画面的取消语义**，这是与分类导航「dragend 无条件 commit」的关键差异（spec 明确要求取消必须恢复原序）。
- 新增 2 条测试：已提交后 `dragend` 不再重置；松在容器空白处也提交。测试 8/8 通过，浏览器实测三场景（drop 落容器首位/末位、dragend 无 drop 取消）全部符合预期。
- Minor #5（handoff 未进分支）同步处理：本文档随修复提交进分支。
- 遗留未动（reviewer 标记 Minor，非阻塞）：默认顺序常量两处维护、双函数定义、500ms 启发式、document 级 touchmove 不卸载、触屏真机回归待合并前人工补验。

## 五、Review 建议重点关注

1. **默认顺序常量两处维护**：`product-detail.html` 的 `DEFAULT_OPTION_GROUP_ORDER` 与 `menu-management.html` 的 `DEFAULT_ORDER_PREVIEW_OPTION_GROUP_ORDER` 必须保持一致；将来新增分组时两边都要动（单文件 HTML 架构下无法共享，属已知取舍，但值得 review 是否接受）。
2. **`product-detail.html` 存在同函数双定义**（如 `buildOrderPreviewDraftPayload` 在 5638 与 10516 两处）：**main 上即如此**（同一 script 块内后者生效），本分支对两份都一致补了新字段。不是本次引入的问题，但 review 时若看到 grep 双命中不必困惑。
3. **500ms 点击抑制窗口**是启发式（`optionGroupIgnoreClickUntil`），覆盖落位重绘后的 click；如觉得偏长/偏短可调。
4. **触屏拖拽没有真实触摸设备回归**（见第八节局限），逻辑靠合成事件测试覆盖。
5. `saveOptionGroupOrderByDom()` 的“完整排列才提交”校验是排序不丢分组的关键防线，值得看一眼。

## 六、如何本地跑起来

```bash
git fetch origin && git checkout codex/product-images-option-order-preview
python3 scripts/no_cache_http_server.py --port 8080
```

入口：`http://127.0.0.1:8080/menu-management.html` → 任意商品卡“编辑”进详情页。
**注意**：详情页 URL 里的 `payloadKey` 是一次性 sessionStorage 传输（`productDetailPayload:*`），直接刷新详情页会落到空表单——这是既有设计不是 bug，重新从列表进即可。

## 七、测试现状

```bash
node --test tests/product-detail.images-order.test.js                    # 6/6 ✅
node --test tests/prd-product-images-option-order.test.js                # 2/2 ✅
node --test tests/product-detail.option-status.runtime.test.js \
              tests/menu-management.option-status.runtime.test.js \
              tests/menu-management.behavior.test.js                     # ✅
node --test tests/*.test.js                                             # 123/131
```

全量 8 个失败**均为既有失败**，已在 `origin/main` 基线逐一复现（与本分支无关）：
`admin-page-i18n`、`device-search.location-name`、`locations.merchant-scope`、`login-pages.runtime`、`login-pages.structure`、`prd-device-management-user-flow-html`（缺 `prd-site/` 上传包，未构建）、`product-detail.pricing`、`sidebar.customer-nav-role`（缺 locations.html 侧栏改动）。

## 八、验收记录（2026-09-10，本仓库实测）

按 spec“浏览器验收”8 条逐一执行，全部通过：

| # | 验收项 | 结果 |
|---|---|---|
| 1 | 详情图为空显示列表图 + “当前跟随列表页图片” | ✅ |
| 2 | 输入独立详情图：列表图不变、状态切换“使用独立详情图”、改列表图详情图不动 | ✅ |
| 3 | “使用列表页图片”恢复跟随（input 清空、预览回到列表图） | ✅ |
| 4 | 拖中间分组到首位/末位：虚线占位按上下半区落位、DOM 与草稿顺序更新 | ✅ |
| 5 | 拖拽后点击其他分组正常切换；拖拽落位后的抑制窗口内点击不误切 | ✅ |
| 6 | 不保存直接预览：列表卡用 `image`、详情用草稿 `detailImage`、分组按草稿顺序（拉花→咖啡豆→…），切英文文案顺序不变 | ✅ |
| 7 | 保存→`menuProductEdits` 两字段落盘→回列表重进，两字段完整回显 | ✅ |
| 8 | 375px 窄屏：图片区纵向堆叠、分组导航纵向滚动、手柄可见 | ✅ |

取消路径：鼠标 `dragend` 无 `drop`、触屏 `touchcancel` 均验证恢复原顺序且清理占位/dragging 类。Alt+↑/↓ 首尾不越界、重绘后焦点保留。

**验证方法的局限**（review 时知悉）：
- 拖拽通过合成事件（构造 `dataTransfer` stub / `TouchEvent` 字段）驱动，非真实鼠标拖放/触摸；真实浏览器 DnD 的 `dragover` 间隔节流等行为未覆盖。
- 预览验证时用了 `example.com` 假 URL 测图片，加载失败路径（保留输入可编辑 + 错误提示）因此顺带验证过，但真实 OSS 图的成功路径在步骤 7 回显时验证。
- 保存流程中曾遇到“原价需大于商品价格”校验失败，是验证脚本填了非法原价所致，清空后保存成功，非本变更缺陷。

## 九、遗留与待决

1. ~~手稿目录里本文档尚未提交~~ 已随 `24b1bba` 提交进分支。
2. `prd-site/` 全量 bundle 未重新构建（既有失败之一），不影响本分支；若 review 后要发 PRD 站点，走 `scripts/deploy_prd_pages.sh`。
3. 触屏真机回归（手机/平板实机拖一次）建议在合并前补一次人工验证。

## 十、文档索引

- PRD（md/html）：`tasks/prd-product-detail-images-option-group-order.*`
- 工程师 spec：`docs/superpowers/specs/2026-09-09-product-images-option-order-spec.md`
- 实施计划：`docs/plans/2026-09-09-product-images-option-order-plan.md`
- 验收截图：`screenshots/product-prd/images-order/`（8 张）、编辑器与预览总览 3 张
