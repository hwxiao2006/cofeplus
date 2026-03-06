# 侧边栏头部统一对齐 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 11 个带同款侧栏的页面中统一 `Prototype v0`、登录信息（仅总览页）以及 section title 的左对齐基准。

**Architecture:** 通过在各页面 `.sidebar` 上定义统一横向变量，驱动 `.sidebar-header`、`.sidebar-nav`、`.nav-section-title` 的缩进；`brand-version` 与 `sidebar-login` 改用同一公式计算左边距，避免写死数值。只调整样式层，不改动导航结构与脚本行为。

**Tech Stack:** 原生 HTML / CSS / JavaScript，Node.js 静态行为测试（`tests/overview.sidebar-login.test.js`、`tests/overview.multi-currency.test.js`、`tests/overview.hourly-chart-values.test.js`）。

---

### Task 1: 锁定总览页对齐规则

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/overview.sidebar-login.test.js`
- Test: `/Users/tigerhuang/cofeplus/tests/overview.sidebar-login.test.js`

**Step 1: 写对齐规则失败断言**
- 为 `overview.html` 补充断言，要求存在统一侧栏变量以及 `padding-left: calc(...)` 的对齐公式。
- 断言 `sidebar-login`、`brand-version` 与 section title 共享同一横向基准。

**Step 2: 运行测试确认失败**
- Run: `node --test tests/overview.sidebar-login.test.js`
- Expected: FAIL，提示缺少统一变量或缺少对齐公式。

**Step 3: 最小实现使断言通过**
- 在 `overview.html` 引入统一变量。
- 将 `.sidebar-header`、`.sidebar-nav`、`.nav-section-title`、`.brand-version`、`.sidebar-login` 改为基于变量布局。

**Step 4: 运行测试确认通过**
- Run: `node --test tests/overview.sidebar-login.test.js`
- Expected: PASS。

**Step 5: Commit**
```bash
git add tests/overview.sidebar-login.test.js overview.html
git commit -m "style: align overview sidebar header content"
```

### Task 2: 同步其余侧栏页面

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/menu.html`
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Modify: `/Users/tigerhuang/cofeplus/devices.html`
- Modify: `/Users/tigerhuang/cofeplus/orders.html`
- Modify: `/Users/tigerhuang/cofeplus/materials.html`
- Modify: `/Users/tigerhuang/cofeplus/faults.html`
- Modify: `/Users/tigerhuang/cofeplus/customers.html`
- Modify: `/Users/tigerhuang/cofeplus/locations.html`
- Modify: `/Users/tigerhuang/cofeplus/staff-management.html`
- Modify: `/Users/tigerhuang/cofeplus/product-detail.html`

**Step 1: 统一变量定义**
- 在每个页面 `.sidebar` 上补充：
  - `--sidebar-header-padding-x: 24px;`
  - `--sidebar-nav-padding-x: 12px;`
  - `--sidebar-section-title-padding-x: 14px;`

**Step 2: 统一头部和导航缩进**
- 将 `.sidebar-header` 的横向 padding 改为 `var(--sidebar-header-padding-x)`。
- 将 `.sidebar-nav` 改为 `padding: 8px var(--sidebar-nav-padding-x);`（若页面已有不同的纵向 padding，保留纵向值，仅统一横向值）。
- 将 `.nav-section-title` 横向 padding 改为 `var(--sidebar-section-title-padding-x)`。

**Step 3: 统一 `Prototype v0` 左边距**
- 将 `.brand-version` 的 `padding-left` 改为：
  - `calc(var(--sidebar-nav-padding-x) + var(--sidebar-section-title-padding-x) - var(--sidebar-header-padding-x))`
- 若页面已存在其他头部说明文本，确保仅调整本元素左边距。

**Step 4: 保护现有交互与视觉**
- 不修改任何侧栏 HTML 结构、链接顺序、激活态 class 或脚本函数。
- 不为没有登录信息的页面新增登录节点。

**Step 5: Commit**
```bash
git add menu.html menu-management.html devices.html orders.html materials.html faults.html customers.html locations.html staff-management.html product-detail.html
git commit -m "style: unify sidebar header alignment"
```

### Task 3: 回归总览页登录信息与关联样式

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/overview.html`
- Test: `/Users/tigerhuang/cofeplus/tests/overview.multi-currency.test.js`
- Test: `/Users/tigerhuang/cofeplus/tests/overview.hourly-chart-values.test.js`
- Test: `/Users/tigerhuang/cofeplus/tests/overview.sidebar-login.test.js`

**Step 1: 确认登录信息继续复用统一对齐基准**
- 保留 `sidebar-login` 单行方案。
- 让登录名、电话、`Prototype v0` 与 section title 共用同一对齐公式。

**Step 2: 运行总览页相关测试**
- Run: `node --test tests/overview.sidebar-login.test.js tests/overview.multi-currency.test.js tests/overview.hourly-chart-values.test.js`
- Expected: 全部 PASS。

**Step 3: 若失败则最小修正**
- 仅修正由于变量统一带来的样式或选择器回归。
- 不扩大到新的视觉方案。

**Step 4: 最终检查目标文件**
- 检查 11 个页面是否都完成变量统一。
- 确认未误改无关结构。

**Step 5: Commit**
```bash
git add overview.html tests/overview.sidebar-login.test.js tests/overview.multi-currency.test.js tests/overview.hourly-chart-values.test.js
git commit -m "test: cover sidebar alignment consistency"
```
