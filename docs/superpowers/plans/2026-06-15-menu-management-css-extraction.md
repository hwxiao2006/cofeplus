# menu-management CSS 外抽 实现计划（v2：theme + 页面，含 getPageCss 安全网）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把 `menu-management.html` 的 5,627 行内联 `<style>` 外抽为 `shared/theme.css`（仅 `:root` 主题块）+ `pages/menu-management/menu-management.css`（其余全部，含侧边栏样式，原序不动）。渲染逐像素不变、JS 一字不动。

**Architecture:** 先建 `getPageCss()` 测试助手并把"断言 menu-management 内联 CSS"的测试改为读它（此刻还没外抽，助手返回内联 CSS，所有测试维持绿）；再整段 `<style>` 原样搬到页面 CSS（byte 级、零重排）；再把连续的 `:root` 块拉到 `shared/theme.css`（加载于页面 CSS 之前）。**不抽侧边栏**（避开非连续 carve 与 `.selector` 陷阱）。全程不碰 `<script>`，运行时测试不受影响。

**Tech Stack:** 纯静态 HTML/CSS（无构建）；测试 `node --test tests/*.test.js`（注意：`node --test tests/` 在 Node 22 会 MODULE_NOT_FOUND，必须用 glob）；视觉回归 gstack `/browse`；本地服务 `python3 scripts/no_cache_http_server.py --port 8080`。

**Spec:** `docs/superpowers/specs/2026-06-15-buildless-page-split-refactor-design.md`

---

## 已知基线（执行前实测）

- 测试命令必须是 `node --test tests/*.test.js`（101 测试）。
- **基线非全绿：5 个预存失败**（`login-pages.runtime`、`login-pages.structure`、`device-search.location-name`、`pages.font-stack`、`product-detail.pricing`）——经根因调查，均为**别页（device-entry/devices/product-detail/login）在途功能**所致，**与 menu-management 与本次 CSS 外抽无关**。**本次不修这 5 个**；只需保证不让它们新增失败原因。基线 = 96 pass / 5 fail，须保持。
- `<style>` 唯一：`menu-management.html` 第 8 行 `<style>`、第 5636 行 `</style>`（已确认各唯一）。
- 零 `fetch`/XHR/module/绝对路径 → `file://` 可开。
- `:root` 唯一（第 9 行起，连续块），19 个变量无竞争定义。

## 会被 CSS 外抽打破、需改用 getPageCss 的测试（实测清单）

这些测试对 `menu-management.html` 原文做 `html.match(/CSS规则/)`，CSS 一外抽就找不到 → 失败。**只改它们断言 CSS 规则的部分**，HTML 标记断言、`<script>` 提取、out-of-scope 的失败断言一律不动：

| 测试文件 | 需迁移的 CSS 断言 | 移到哪 |
|---|---|---|
| `menu-card-density.test.js` | `.product-grid` 5列 `@media`（line 18-25，loop 含 menu-management.html） | 页面 CSS |
| `menu-management.behavior.test.js` | line 2143 `.header-title` @media；2174-2177 `.menu-manage-toolbar`/`.product-grid` | 页面 CSS |
| `pages.font-stack.test.js` | body 字体栈正向断言（`expectedBodyFont`，loop 含 menu-management.html）。**不要动** line 50/51 `fonts.googleapis.com`、line 56 `.mobile-order-id`（out-of-scope，devices/orders） | 页面 CSS |
| `sidebar.shared-alignment.test.js` | `--sidebar-*` 变量、`.brand-version`/`.nav-section-title`（loop 含 menu-management.html） | theme/页面 CSS |
| `sidebar.admin-lang.test.js` | line 48 `.sidebar-meta-row`（针对 menu-management.html） | 页面 CSS |
| `sidebar.shared-login.test.js` | **仅当**其断言 CSS 规则时才迁移；若断言的是 HTML 标记（`.sidebar-login` 元素存在等）则不动 | 视情况 |

`getPageCss(file)` 对未重构页（menu.html/overview.html/devices.html 等）返回其内联 CSS，行为不变；故 loop 内统一改用它是安全且面向未来的。

## 回归截图清单（SCREENS）

gstack `/browse` 打开 `http://localhost:8080/menu-management.html`，截取并与基线比对：①默认菜单视图(1280px) ②侧边栏导航+登出 ③`.sidebar-selectors` 选择器区 ④分类管理 ⑤商品编辑弹窗 ⑥语言/设备切换 ⑦移动端768px。

---

## Task 1: getPageCss 助手 + 迁移受影响测试（安全网，最先做）

**Files:**
- Create: `tests/helpers/page-css.js`
- Modify: 上表 6 个测试文件（仅 CSS 断言部分）

- [ ] **Step 1: 写助手**

创建 `tests/helpers/page-css.js`：
```js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..'); // tests/helpers -> repo root

// 返回某页面的“有效 CSS”：内联 <style> 块 + 所有本地 <link rel=stylesheet> 文件，拼接。
// 外链(http/协议相对)样式表跳过。用于让“断言 CSS 存在”的测试对内联/外抽两种形态都成立。
function getPageCss(file) {
  const htmlPath = path.join(ROOT, file);
  const html = fs.readFileSync(htmlPath, 'utf8');
  let css = '';
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html)) !== null) css += '\n' + m[1];
  const linkRe = /<link[^>]+rel="stylesheet"[^>]*>/gi;
  let lm;
  while ((lm = linkRe.exec(html)) !== null) {
    const hm = lm[0].match(/href="([^"]+)"/i);
    if (!hm) continue;
    const href = hm[1];
    if (/^(https?:)?\/\//i.test(href)) continue; // 跳过外链
    const cssPath = path.join(path.dirname(htmlPath), href);
    if (fs.existsSync(cssPath)) css += '\n' + fs.readFileSync(cssPath, 'utf8');
  }
  return css;
}

module.exports = { getPageCss };
```

- [ ] **Step 2: 自测助手（临时）**

Run:
```bash
node -e "const {getPageCss}=require('./tests/helpers/page-css'); const c=getPageCss('menu-management.html'); console.log('len', c.length); console.log('has product-grid 5col', /grid-template-columns:\s*repeat\(5,/.test(c)); console.log('has :root --primary', /:root[\s\S]*--primary/.test(c));"
```
Expected: `len` 很大（≈内联CSS体量）；两个 `true`。证明此刻（未外抽）助手能从内联 `<style>` 取到这些规则。

- [ ] **Step 3: 迁移 6 个测试的 CSS 断言**

对上表每个文件：`require('./helpers/page-css')`（注意相对路径，测试在 `tests/`，助手在 `tests/helpers/`，故 `require('./helpers/page-css')`），把对应 CSS 规则断言里读取的 `html`/`readFileSync(...menu-management.html)` 换成 `getPageCss(file)`。逐文件核对：
- **只**替换 CSS 规则断言；HTML 标记断言（`html.includes('class="...')`、`<script src=...>`）、`<script>` 提取、out-of-scope 失败断言**保持不动**。
- 多页 loop（menu-card-density / pages.font-stack / sidebar.shared-alignment / sidebar.admin-lang）：把 loop 内 CSS 断言的数据源统一改 `getPageCss(file)`。
- `pages.font-stack`：**仅**改 `expectedBodyFont` 正向断言；`fonts.googleapis.com`/`.mobile-order-id` 断言不动。
- `menu-management.behavior`：仅改 2143/2174-2177 的 CSS 断言；该文件其余（vm 运行时、`<script src>` 静态断言）不动。
- `sidebar.shared-login`：先读其断言；只有断言 CSS 规则的才迁移。

- [ ] **Step 4: 全量测试——保持基线 96/5**

Run: `node --test tests/*.test.js 2>&1 | tail -8`
Expected: `# pass 96 # fail 5`（与基线**完全一致**）。失败仍是那 5 个预存项，无新增、无减少。若 pass 变少或失败集变化，说明迁移误伤，修正。

- [ ] **Step 5: 提交**

```bash
git add tests/helpers/page-css.js tests/menu-card-density.test.js tests/menu-management.behavior.test.js tests/pages.font-stack.test.js tests/sidebar.shared-alignment.test.js tests/sidebar.admin-lang.test.js tests/sidebar.shared-login.test.js
git commit -m "test: add getPageCss helper; read effective page CSS so assertions survive CSS extraction"
```

---

## Task 2: 整段 `<style>` 外抽到 `pages/menu-management/menu-management.css`

**Files:**
- Create: `pages/menu-management/menu-management.css`
- Modify: `menu-management.html`（第 8–5636 行 `<style>…</style>` → 一个 `<link>`）
- Test: `tests/menu-management.css-extraction.test.js`

- [ ] **Step 1: 写失败测试**

创建 `tests/menu-management.css-extraction.test.js`：
```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { getPageCss } = require('./helpers/page-css');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('html 引入外部页面 CSS', () => {
  assert.ok(/<link rel="stylesheet" href="pages\/menu-management\/menu-management\.css">/.test(read('menu-management.html')));
});
test('html 不再有内联 <style>', () => {
  const html = read('menu-management.html');
  assert.ok(!html.includes('<style'), '仍有 <style');
  assert.ok(!html.includes('</style>'), '仍有 </style>');
});
test('页面 CSS 文件存在且非空', () => {
  assert.ok(exists('pages/menu-management/menu-management.css'));
  assert.ok(read('pages/menu-management/menu-management.css').length > 50000);
});
test('getPageCss 仍能取到关键规则（经外部文件）', () => {
  const css = getPageCss('menu-management.html');
  assert.ok(/grid-template-columns:\s*repeat\(5,/.test(css), '丢失 5 列网格规则');
  assert.ok(css.includes('.sidebar'), '丢失侧边栏样式');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/menu-management.css-extraction.test.js 2>&1 | tail -12` → FAIL。

- [ ] **Step 3: 外抽 `<style>` 内容到页面 CSS**

Run:
```bash
mkdir -p pages/menu-management
awk '/<\/style>/{f=0} f{print} /<style[ >]/{f=1}' menu-management.html > pages/menu-management/menu-management.css
wc -l pages/menu-management/menu-management.css   # 应≈5,627
```

- [ ] **Step 4: 用 `<link>` 替换 `<style>…</style>`（位置不变）**

Run:
```bash
awk '
  /<style[ >]/ {print "    <link rel=\"stylesheet\" href=\"pages/menu-management/menu-management.css\">"; skip=1; next}
  /<\/style>/ {skip=0; next}
  !skip {print}
' menu-management.html > menu-management.html.tmp && mv menu-management.html.tmp menu-management.html
```

- [ ] **Step 5: 校验 JS 一字未动**

Run: `git diff -U0 menu-management.html | grep '^+' | grep -v '^+++' | grep -vc 'link rel="stylesheet"'`
Expected: `0`（除那一行 `<link>` 外无新增）。再 `git diff -U0 menu-management.html | grep -c '^-'` 应≈5,629。

- [ ] **Step 6: 新测试通过**

Run: `node --test tests/menu-management.css-extraction.test.js 2>&1 | tail -8` → PASS。

- [ ] **Step 7: 全量测试保持 96+新 / 5**

Run: `node --test tests/*.test.js 2>&1 | tail -8`
Expected: 失败集仍是那 5 个预存项（**无新增**）；pass = 96 + 新测试文件计入的通过数。

- [ ] **Step 8: 截图回归**

本地服务跑起来，gstack `/browse` 按 SCREENS 截图到 `/tmp/css-refactor/after-task2/`，与 `/tmp/css-refactor/baseline/` 逐屏比对。Expected: 7 屏逐像素一致。差异则停止排查。

- [ ] **Step 9: 提交**

```bash
git add menu-management.html pages/menu-management/menu-management.css tests/menu-management.css-extraction.test.js
git commit -m "refactor(menu-management): extract inline <style> to external page CSS"
```

---

## Task 3: 碎出主题层 `shared/theme.css`

**Files:**
- Create: `shared/theme.css`
- Modify: `pages/menu-management/menu-management.css`（移除 `:root{}`）、`menu-management.html`（页面 CSS 之前加 `<link>`）
- Test: `tests/menu-management.css-extraction.test.js`

- [ ] **Step 1: 追加失败测试**

追加：
```js
test('shared/theme.css 含主题变量', () => {
  assert.ok(exists('shared/theme.css'));
  const css = read('shared/theme.css');
  assert.ok(css.includes(':root') && css.includes('--primary'));
});
test('页面 CSS 不再含 :root（已移动非复制）', () => {
  assert.ok(!read('pages/menu-management/menu-management.css').includes(':root'));
});
test('theme.css <link> 在页面 CSS 之前', () => {
  const html = read('menu-management.html');
  assert.ok(html.indexOf('shared/theme.css') < html.indexOf('pages/menu-management/menu-management.css'));
});
test('getPageCss 仍取到主题变量与页面规则', () => {
  const css = getPageCss('menu-management.html');
  assert.ok(/--primary/.test(css) && /grid-template-columns:\s*repeat\(5,/.test(css));
});
```

- [ ] **Step 2: 运行确认失败** → Run: `node --test tests/menu-management.css-extraction.test.js 2>&1 | tail -12`。

- [ ] **Step 3: 确认 `:root` 行范围**

Run: `grep -n ':root\|^}' pages/menu-management/menu-management.css | head -3` + `sed -n '1,25p' pages/menu-management/menu-management.css`，记下 `:root {` 行 A 与其闭合 `}` 行 B。

- [ ] **Step 4: 移动 `:root{}` → theme.css**

Run（A、B 代入；macOS sed 用 `-i ''`）:
```bash
sed -n "A,Bp" pages/menu-management/menu-management.css > shared/theme.css
sed -i '' "A,Bd" pages/menu-management/menu-management.css
head -3 shared/theme.css   # 应是 :root { ...
```

- [ ] **Step 5: 加 theme.css 的 `<link>`（页面 CSS 之前）**

用 Edit 把 `<link rel="stylesheet" href="pages/menu-management/menu-management.css">` 替换为：
```html
    <link rel="stylesheet" href="shared/theme.css">
    <link rel="stylesheet" href="pages/menu-management/menu-management.css">
```

- [ ] **Step 6: 新测试通过** → `node --test tests/menu-management.css-extraction.test.js 2>&1 | tail -8` PASS。

- [ ] **Step 7: 全量 + 截图回归** → `node --test tests/*.test.js 2>&1 | tail -8` 失败集仍是那 5 个预存项；gstack 截图 `/tmp/css-refactor/after-task3/` 逐屏对基线一致。

- [ ] **Step 8: 提交**

```bash
git add shared/theme.css pages/menu-management/menu-management.css menu-management.html tests/menu-management.css-extraction.test.js
git commit -m "refactor(menu-management): extract :root theme vars to shared/theme.css"
```

---

## Task 4: 文档与终验

**Files:** Modify `CLAUDE.md`、spec 文件

- [ ] **Step 1: 更新 CLAUDE.md Project Structure**

在 `shared/admin-staff-access.js` 行后追加：
```markdown
- `shared/theme.css` - 共享主题变量（`:root` 设计令牌），由 menu-management 首先采用
- `pages/<page>/` - 页面专属外部 CSS（无构建，经 `<link>` 引入）；首例 `pages/menu-management/menu-management.css`
```

- [ ] **Step 2: 更新 spec 状态行** 改为 `- 状态：已实现（CSS 薄片：theme + 页面，YYYY-MM-DD）`（填当天）。

- [ ] **Step 3: 终验测试** → `node --test tests/*.test.js 2>&1 | tail -8`：失败集 = 基线那 5 个预存项，无新增。

- [ ] **Step 4: 终验体量** → `wc -l menu-management.html shared/theme.css pages/menu-management/menu-management.css`：HTML ≈ 8,900；两 CSS 合计 ≈ 5,627。

- [ ] **Step 5: 终验 file://** → gstack `/browse` 打开 `file://<repo绝对路径>/menu-management.html`，样式完整、无 404。

- [ ] **Step 6: 提交**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-06-15-buildless-page-split-refactor-design.md
git commit -m "docs: record menu-management CSS extraction (structure + spec status)"
```

---

## 自检

- 安全网先行（getPageCss）→ Task 1，外抽前后测试集不变。✓
- 整段搬运零重排（spec §5.1 重排风险被消除：侧边栏 CSS 留页面文件、原序不动）。✓
- 只抽 theme+页面、不抽 sidebar（用户决策）→ Task 2/3，无 admin-sidebar.css。✓
- 不碰 JS（spec §2）→ Task 2 Step 5 校验。✓
- 预存 5 失败不修、不变更糟（用户决策）→ 各 Step 全量测试断言"失败集 = 那 5 个"。✓
- 验证：截图/`node --test tests/*.test.js`/file:// → Task 各步 + Task 4。✓
