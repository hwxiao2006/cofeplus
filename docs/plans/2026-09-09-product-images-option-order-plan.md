# 商品图片与选项分组排序预览实施计划

**Goal:** 列表图和详情图分别维护，详情图默认跟随列表图；商品选项分组可通过 ⠿ 手柄拖动排序，并在未保存及保存后的点单屏预览中保持一致。

**Architecture:** 保留现有独立 HTML 页面和草稿 postMessage 流程。商品新增 detailImage（空值表示跟随列表图）和 optionGroupOrder（分组键数组）；兼容缺失字段的旧商品。组内选项、默认项、价格和状态不变。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node test/VM、gstack browse。

- [x] product-detail.html：新增详情图 URL、本地上传、恢复默认与图片预览；保存和两处预览草稿构造函数传递字段。
- [x] product-detail.html：左侧分组沿用分类导航的 ⠿ 拖动手柄和虚线占位，支持鼠标与触屏拖动，排序仅更新当前商品草稿；默认顺序沿用点单屏已有顺序。
- [x] menu-management.html：草稿规范化和合并保留两字段；列表仍用 image，详情优先 detailImage；分组按保存顺序并补全遗漏项。
- [x] tests/product-detail.images-order.test.js：结构及 VM 检查默认、覆盖、重置、排序边界、草稿合并、详情渲染。
- [x] 运行相关回归测试及全量 node --test tests/，浏览器验证并启动本地预览供用户审阅。

用户已确认交互方案并要求先预览。本轮交付本地可交互版本，不提交发布。

验证结果：新增 4 项结构/VM 测试通过，相关行为回归通过。Node 当前不接受目录参数，改用 `node --test tests/*.test.js`：120 通过、7 个失败文件；用 HEAD 页面内容替换读取重跑，确认原有失败相同。浏览器实测草稿未写存储、详情图覆盖列表图、分组同步、保存重开、本地 PNG 上传、恢复默认通过。截图保存于 screenshots/*2026-09-09.png。

交互修订：依用户反馈移除上下按钮，沿用分类导航拖拽。拖动取消不提交，拖动后保留当前编辑分组和未保存内容。浏览器验证 native drag 事件流程、touch 流程、草稿隔离、预览同步通过；新增取消及提交回归测试通过。
