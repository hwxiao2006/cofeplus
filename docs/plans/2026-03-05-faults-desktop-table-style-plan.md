# 故障管理页桌面端表格式重设计 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变现有交互行为的前提下，将 `faults.html` 的桌面端故障列表改为运维控制台风格的表格式展示。

**Architecture:** 保留现有页面骨架与脚本入口，通过 CSS 重构桌面列表视觉层，并将 `renderList()` 的卡片模板替换为“表头 + 表体行”结构；远程操作按钮逻辑与 overlay 逻辑完全复用。

**Tech Stack:** 原生 HTML / CSS / JavaScript，Node.js 行为测试（`tests/faults.behavior.test.js`）。

---

### Task 1: 重构桌面端列表样式与结构

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/faults.html`

**Step 1: 定义表格式样式容器**
- 在现有样式中新增/替换桌面端列表样式：表格容器、表头、表体行、行 hover、操作列按钮尺寸。
- 保留移动端媒体查询，确保窄屏自动切换为堆叠信息块。

**Step 2: 调整列表渲染模板**
- 修改 `renderList()`，输出统一表格结构：
  - 表头：设备编号、设备地址、故障内容、故障发生时间、操作
  - 表体：逐行设备数据
- 保持按钮调用 `openRemoteActions('<deviceId>')` 不变。

**Step 3: 保留空状态与关键 class**
- 继续输出 `fault-actions` 和 `fault-action-btn`，兼容既有行为测试。
- 无数据时保持“暂无故障记录”提示。

### Task 2: 回归验证

**Files:**
- Test: `/Users/tigerhuang/cofeplus/tests/faults.behavior.test.js`

**Step 1: 运行故障页行为测试**
- Run: `node tests/faults.behavior.test.js`
- Expected: 全部 PASS（尤其是“仅保留远程操作按钮”“只展示故障设备”“无状态 Tab”）。

**Step 2: 若失败则最小修正**
- 仅修正因结构调整导致的断言不兼容，不引入新交互。

**Step 3: 最终检查**
- 确认只修改本需求相关文件与文档。
