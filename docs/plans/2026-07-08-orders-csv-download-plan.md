# 订单管理页「下载订单」CSV 导出实现计划

日期：2026-07-08
状态：已实现

## 背景

订单管理页（orders.html）此前只能在线查看订单，没有导出能力。运营需要把筛选后的订单带走做对账/报表，本次新增「下载订单」按钮，将当前筛选结果导出为标准 CSV。

## 需求口径（已确认）

- **范围**：导出当前筛选结果 `filteredData`（跨分页全部，已含员工设备权限、状态/设备/关键词/日期筛选与排序），与工具栏「共 N 条」口径一致。
- **格式**：标准 CSV——逗号分隔、UTF-8 BOM（`﻿`，防 Excel 中文乱码）、CRLF 行尾、RFC 4180 转义（含逗号/引号/换行的字段加引号，内部引号翻倍）。
- **字段**：与表格可见列一致：`点位,商品,时间,设备,取货码,订单号,状态,金额`（操作列除外）。

## 实现

### orders.html

1. **按钮**：`.order-toolbar-actions` 内、排序触发器与分页之间插入
   `<button type="button" class="btn-download-orders" id="downloadOrdersBtn" onclick="downloadFilteredOrders()">下载订单</button>`。
2. **CSS**：新增独立类 `.btn-download-orders`（白底次级样式，对齐 `.btn-clear`；focus 圈同现有 teal 规则）；`@media (max-width: 1024px)` 内加 `width: 100%; min-height: 44px; font-size: 16px;`，移动端在排序触发器与分页之间全宽堆叠。刻意不改动任何既有选择器块（多个回归测试用正则断言既有 CSS）。
3. **JS**（位于 `getOrderPickupCodeDisplay` 之后，与其它订单格式化 helper 同区）：
   - `escapeCsvField(value)`：标准 CSV 字段转义。
   - `buildOrdersCsv(orderList)`：输出不含 BOM 的纯 CSV 文本；商品列用 `normalizeOrderItems` 序列化为 `名称(规格) ×数量`、`；` 连接；点位/取货码/状态/金额分别复用 `deviceContextMap`、`getOrderPickupCodeDisplay`、`statusMap`、`formatMoneyByCurrency` + `getOrderCurrency`。
   - `downloadFilteredOrders()`：空结果 error toast 拦截；否则按 product-detail.html 既有下载机制（Blob → createObjectURL → 临时 `<a download>` → click → revoke）导出 `orders-export-YYYY-MM-DD.csv`（本地日期，非 UTC），成功 toast「已导出 N 条订单」。

关键风险点：`formatMoneyByCurrency` 用 en-US locale，金额 ≥1000 会含千分位逗号（如 `CNY 1,234.00`），必须按字段转义，否则列错位——已由 runtime 测试覆盖。

### 测试

- `tests/orders.download-csv.test.js`：静态结构断言（按钮/函数/表头/BOM/MIME/文件名/空守卫文案/桌面与移动 CSS）。
- `tests/orders.download-csv.runtime.test.js`：VM 沙箱执行三个函数，覆盖转义边界（逗号/引号/换行/null）、表头与 CRLF、多商品序列化、千分位金额加引号、取货码 `--` 兜底、空列表守卫、happy path（BOM/MIME/文件名/click/revoke/成功 toast）。

## 验证

- `node --test tests/orders.download-csv.test.js tests/orders.download-csv.runtime.test.js` 全过。
- `node --test tests/orders.*.test.js`：18 个订单测试全过；全仓 7 个失败均为 main 上既有失败（i18n/login/locations/product-detail），与本改动无关（stash 后复测确认）。
- 浏览器手动验证：桌面端按钮位置与下载内容、移动端全宽布局、空结果 toast。
