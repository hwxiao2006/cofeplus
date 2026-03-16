# COFEPLUS Login Gallery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-concept high-fidelity login gallery that becomes the new prototype entry point and lets any concept page validate credentials locally, persist a lightweight session, update the existing sidebar login profile, and enter `overview.html`.

**Architecture:** Keep the repository's existing single-file HTML pattern. Add one gallery page plus three standalone login pages with concept-specific CSS and same-page JavaScript handlers. Cover the work with one routing/gallery test, one structure/responsiveness test, one runtime login-flow test, and a small extension to the existing font-stack regression test.

**Tech Stack:** Static HTML, inline CSS, inline vanilla JavaScript, `localStorage`, Node.js built-in test runner, regex-based HTML assertions, `vm`-based runtime tests.

---

## File Structure

- Reuse: `/Users/mac/Documents/New project 4/logo.png`
  Responsibility: existing brand asset for the gallery and standalone login pages.
- Modify: `/Users/mac/Documents/New project 4/index.html`
  Responsibility: change the default entry redirect from `overview.html` to `login-gallery.html`.
- Create: `/Users/mac/Documents/New project 4/login-gallery.html`
  Responsibility: first-stop comparison page with three concept cards linking to the standalone login pages.
- Create: `/Users/mac/Documents/New project 4/login-morning.html`
  Responsibility: morning cafe concept with minimal login form and shared login flow logic.
- Create: `/Users/mac/Documents/New project 4/login-counter.html`
  Responsibility: night bar concept with minimal login form and shared login flow logic.
- Create: `/Users/mac/Documents/New project 4/login-paper.html`
  Responsibility: handcrafted menu paper concept with minimal login form and shared login flow logic.
- Create: `/Users/mac/Documents/New project 4/tests/login-gallery.entry.test.js`
  Responsibility: verify `index.html` redirects to the gallery and the gallery exposes all three concept links plus responsive hooks.
- Create: `/Users/mac/Documents/New project 4/tests/login-pages.structure.test.js`
  Responsibility: verify each standalone login page contains the required copy, fields, theme hooks, and mobile breakpoint.
- Create: `/Users/mac/Documents/New project 4/tests/login-pages.runtime.test.js`
  Responsibility: execute login-page inline scripts in a VM and verify validation, loading state, session persistence, sidebar profile writes, and redirect behavior.
- Modify: `/Users/mac/Documents/New project 4/tests/pages.font-stack.test.js`
  Responsibility: extend the shared body font-stack regression to the new login pages.

## Chunk 1: Entry Routing And Gallery

### Task 1: Redirect The Prototype Entry To A Gallery Page

**Files:**
- Create: `/Users/mac/Documents/New project 4/tests/login-gallery.entry.test.js`
- Modify: `/Users/mac/Documents/New project 4/index.html`
- Create: `/Users/mac/Documents/New project 4/login-gallery.html`

- [ ] **Step 1: Write the failing routing and gallery test**

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const galleryHtml = fs.readFileSync(path.join(root, 'login-gallery.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('index 应跳转到 login-gallery.html', () => {
  assert.ok(/url=login-gallery\.html/.test(indexHtml));
  assert.ok(/window\.location\.replace\('login-gallery\.html'\)/.test(indexHtml));
});

test('gallery 页应展示三套登录方案入口', () => {
  assert.ok(/href="login-morning\.html"/.test(galleryHtml));
  assert.ok(/href="login-counter\.html"/.test(galleryHtml));
  assert.ok(/href="login-paper\.html"/.test(galleryHtml));
  assert.ok(/清晨咖啡馆/.test(galleryHtml));
  assert.ok(/夜间吧台/.test(galleryHtml));
  assert.ok(/手作菜单纸/.test(galleryHtml));
});

test('gallery 页应包含移动端断点和统一品牌文案', () => {
  assert.ok(/COFE\+/.test(galleryHtml));
  assert.ok(/运营控制台/.test(galleryHtml));
  assert.ok(/@media\s*\(max-width:\s*768px\)/.test(galleryHtml));
});
```

- [ ] **Step 2: Run the routing test to verify it fails**

Run: `node --test tests/login-gallery.entry.test.js`

Expected: FAIL because `login-gallery.html` does not exist yet and `index.html` still redirects to `overview.html`.

- [ ] **Step 3: Implement the minimal entry redirect and gallery page**

```html
<!-- index.html -->
<meta http-equiv="refresh" content="0; url=login-gallery.html">
<script>
  window.location.replace('login-gallery.html');
</script>
```

```html
<!-- login-gallery.html -->
<body>
  <main class="gallery-page">
    <header class="gallery-header">
      <img src="logo.png" alt="COFE+ 标识">
      <div>
        <p class="gallery-kicker">COFE+</p>
        <h1>运营控制台登录方案</h1>
      </div>
    </header>
    <section class="gallery-grid">
      <a class="concept-card concept-card-morning" href="login-morning.html">清晨咖啡馆</a>
      <a class="concept-card concept-card-counter" href="login-counter.html">夜间吧台</a>
      <a class="concept-card concept-card-paper" href="login-paper.html">手作菜单纸</a>
    </section>
  </main>
</body>
```

Implementation notes:
- Give the gallery page the repository-standard body font stack immediately.
- Make the three cards visually distinct enough to preview the concepts, but keep the page focused on comparison rather than becoming a fourth design concept.
- Add a `@media (max-width: 768px)` rule that stacks the cards and tightens header spacing.

- [ ] **Step 4: Run the routing test again**

Run: `node --test tests/login-gallery.entry.test.js`

Expected: PASS with 3 passing assertions and no missing-file errors.

- [ ] **Step 5: Commit the entry-and-gallery baseline**

```bash
git add index.html login-gallery.html tests/login-gallery.entry.test.js
git commit -m "feat: add login gallery entry page"
```

### Task 2: Extend The Shared Font Regression To The New Entry Pages

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/pages.font-stack.test.js`
- Modify: `/Users/mac/Documents/New project 4/login-gallery.html`

- [ ] **Step 1: Write the failing font-stack regression**

Update the `pageFiles` array in `tests/pages.font-stack.test.js` to include:

```js
'login-gallery.html',
'login-morning.html',
'login-counter.html',
'login-paper.html'
```

- [ ] **Step 2: Run the font-stack test to verify it fails**

Run: `node --test tests/pages.font-stack.test.js`

Expected: FAIL because the new login pages are not all present yet and the new gallery page may not yet include the exact expected `body` font declaration.

- [ ] **Step 3: Keep the gallery page on the exact shared body font stack**

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
```

Implementation note:
- Do not switch to external web fonts for any of the new pages. Distinction between concepts must come from spacing, color, texture, and composition rather than network-loaded typography.

- [ ] **Step 4: Re-run the font-stack test once the gallery page matches**

Run: `node --test tests/pages.font-stack.test.js`

Expected: still FAIL until the three standalone login pages are added in Chunk 2. Leave the test file updated in place so later tasks close the gap instead of revisiting the regression.

- [ ] **Step 5: Do not commit yet**

Reason:
- This task intentionally leaves the suite red until the standalone login pages exist.
- Fold the `tests/pages.font-stack.test.js` change into the first standalone-page commit.

## Chunk 2: Standalone Login Page Shells

### Task 3: Build The Morning Concept Shell First

**Files:**
- Create: `/Users/mac/Documents/New project 4/tests/login-pages.structure.test.js`
- Create: `/Users/mac/Documents/New project 4/login-morning.html`
- Modify: `/Users/mac/Documents/New project 4/tests/pages.font-stack.test.js`

- [ ] **Step 1: Write the failing morning-page structure test**

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'login-morning.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('morning 登录页应包含统一品牌和表单骨架', () => {
  assert.ok(/COFE\+/.test(html));
  assert.ok(/欢迎登录/.test(html));
  assert.ok(/开始今天的门店运营与设备巡检/.test(html));
  assert.ok(/id="loginAccount"/.test(html));
  assert.ok(/id="loginPassword"/.test(html));
  assert.ok(/进入控制台/.test(html));
});

test('morning 登录页应暴露主题钩子和移动端断点', () => {
  assert.ok(/login-page-morning/.test(html));
  assert.ok(/@media\s*\(max-width:\s*768px\)/.test(html));
  assert.ok(/class="login-stage"/.test(html));
  assert.ok(/class="login-card"/.test(html));
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node --test tests/login-pages.structure.test.js`

Expected: FAIL because `login-morning.html` does not exist yet.

- [ ] **Step 3: Implement the morning-page shell**

```html
<body class="login-page login-page-morning">
  <main class="login-layout">
    <section class="login-stage" aria-hidden="true"></section>
    <section class="login-card">
      <img src="logo.png" alt="COFE+ 标识">
      <p class="login-product-label">运营控制台</p>
      <h1>欢迎登录</h1>
      <p class="login-supporting">开始今天的门店运营与设备巡检</p>
      <form id="loginForm" novalidate>
        <label for="loginAccount">账号</label>
        <input id="loginAccount" name="account" type="text" placeholder="请输入运营账号">
        <label for="loginPassword">密码</label>
        <input id="loginPassword" name="password" type="password" placeholder="请输入登录密码">
        <p id="loginError" class="login-error" role="alert"></p>
        <button id="loginSubmit" type="submit">进入控制台</button>
      </form>
    </section>
  </main>
</body>
```

Implementation notes:
- Use a two-column desktop composition and a stacked mobile layout.
- Keep the background atmospheric via gradients, steam-like shapes, and warm depth; do not depend on photo assets.
- Include the exact shared body font stack so the updated `tests/pages.font-stack.test.js` starts moving back toward green.
- Add only the CSS and markup needed for shell-level structure in this task. Leave the final submit logic to Chunk 3.

- [ ] **Step 4: Run the structure test and font-stack regression**

Run: `node --test tests/login-pages.structure.test.js tests/pages.font-stack.test.js`

Expected:
- `tests/login-pages.structure.test.js`: PASS for the morning-page assertions
- `tests/pages.font-stack.test.js`: still FAIL because `login-counter.html` and `login-paper.html` do not exist yet

- [ ] **Step 5: Commit the first standalone concept**

```bash
git add login-morning.html tests/login-pages.structure.test.js tests/pages.font-stack.test.js
git commit -m "feat: add morning login concept shell"
```

### Task 4: Add The Counter Concept Shell

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/login-pages.structure.test.js`
- Create: `/Users/mac/Documents/New project 4/login-counter.html`

- [ ] **Step 1: Extend the structure test with counter assertions**

Add:

```js
const counterHtml = fs.readFileSync(path.join(__dirname, '..', 'login-counter.html'), 'utf8');

test('counter 登录页应包含统一表单骨架和专属文案', () => {
  assert.ok(/欢迎登录/.test(counterHtml));
  assert.ok(/进入运营后台，查看设备、订单与门店状态/.test(counterHtml));
  assert.ok(/id="loginAccount"/.test(counterHtml));
  assert.ok(/id="loginPassword"/.test(counterHtml));
  assert.ok(/login-page-counter/.test(counterHtml));
});
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node --test tests/login-pages.structure.test.js`

Expected: FAIL because `login-counter.html` does not exist yet.

- [ ] **Step 3: Implement the counter-page shell**

```html
<body class="login-page login-page-counter">
  <main class="login-layout">
    <section class="login-stage" aria-hidden="true"></section>
    <section class="login-card">
      <p class="login-product-label">运营控制台</p>
      <h1>欢迎登录</h1>
      <p class="login-supporting">进入运营后台，查看设备、订单与门店状态</p>
      <!-- same form ids and button text as morning page -->
    </section>
  </main>
</body>
```

Implementation notes:
- Use a darker palette with controlled highlights, not a literal screenshot or photograph.
- Preserve the same DOM ids used by the morning page so the runtime test can treat all login pages uniformly.
- Include the same `@media (max-width: 768px)` breakpoint and exact body font declaration.

- [ ] **Step 4: Run the structure and font-stack tests**

Run: `node --test tests/login-pages.structure.test.js tests/pages.font-stack.test.js`

Expected:
- `tests/login-pages.structure.test.js`: PASS for morning + counter assertions
- `tests/pages.font-stack.test.js`: still FAIL because `login-paper.html` does not exist yet

- [ ] **Step 5: Commit the counter concept**

```bash
git add login-counter.html tests/login-pages.structure.test.js
git commit -m "feat: add counter login concept shell"
```

### Task 5: Add The Paper Concept Shell And Close The Static Regressions

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/login-pages.structure.test.js`
- Create: `/Users/mac/Documents/New project 4/login-paper.html`
- Modify: `/Users/mac/Documents/New project 4/tests/pages.font-stack.test.js`

- [ ] **Step 1: Extend the structure test with paper assertions**

Add:

```js
const paperHtml = fs.readFileSync(path.join(__dirname, '..', 'login-paper.html'), 'utf8');

test('paper 登录页应包含统一表单骨架和专属文案', () => {
  assert.ok(/欢迎登录/.test(paperHtml));
  assert.ok(/连接每日出杯现场，进入运营工作台/.test(paperHtml));
  assert.ok(/id="loginAccount"/.test(paperHtml));
  assert.ok(/id="loginPassword"/.test(paperHtml));
  assert.ok(/login-page-paper/.test(paperHtml));
});
```

- [ ] **Step 2: Run the structure and font-stack tests to verify they fail**

Run: `node --test tests/login-pages.structure.test.js tests/pages.font-stack.test.js`

Expected:
- structure test FAIL because `login-paper.html` does not exist yet
- font-stack test FAIL because the file is still missing

- [ ] **Step 3: Implement the paper-page shell**

```html
<body class="login-page login-page-paper">
  <main class="login-layout login-layout-paper">
    <section class="login-card">
      <p class="login-product-label">运营控制台</p>
      <h1>欢迎登录</h1>
      <p class="login-supporting">连接每日出杯现场，进入运营工作台</p>
      <!-- same form ids and button text as the other concept pages -->
    </section>
  </main>
</body>
```

Implementation notes:
- Use texture, borders, and spacing to make the page feel tactile, but keep the actual form fast to scan.
- Keep the same DOM ids, button label, and placeholder copy as the other concepts.
- Include the exact shared body font stack so `tests/pages.font-stack.test.js` goes green once this page exists.

- [ ] **Step 4: Re-run the structure and font-stack tests**

Run: `node --test tests/login-pages.structure.test.js tests/pages.font-stack.test.js`

Expected: PASS for all assertions in both files.

- [ ] **Step 5: Commit the final static shell**

```bash
git add login-paper.html tests/login-pages.structure.test.js tests/pages.font-stack.test.js
git commit -m "feat: add paper login concept shell"
```

## Chunk 3: Shared Login Runtime And Regression Verification

### Task 6: Add A Runtime Test Harness For Login Validation And Session Persistence

**Files:**
- Create: `/Users/mac/Documents/New project 4/tests/login-pages.runtime.test.js`
- Modify: `/Users/mac/Documents/New project 4/login-morning.html`

- [ ] **Step 1: Write the failing runtime test against the morning page**

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) throw new Error('inline script not found');
  return match[1];
}

function createRuntime(file) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const accountInput = { value: '', focus() {} };
  const passwordInput = { value: '', focus() {} };
  const errorNode = { textContent: '' };
  const submitButton = { disabled: false, textContent: '进入控制台' };
  const form = {
    handler: null,
    addEventListener(type, handler) {
      if (type === 'submit') this.handler = handler;
    }
  };
  const store = {};
  const locationState = { href: file, replacedWith: null };

  const script = `${extractInlineScript(html)}
this.__test = { handleLoginSubmit, validateLoginForm, LOGIN_SESSION_KEY, SIDEBAR_LOGIN_PROFILE_KEY };`;

  vm.runInNewContext(script, {
    console,
    document: {
      getElementById(id) {
        if (id === 'loginForm') return form;
        if (id === 'loginAccount') return accountInput;
        if (id === 'loginPassword') return passwordInput;
        if (id === 'loginError') return errorNode;
        if (id === 'loginSubmit') return submitButton;
        return null;
      },
      addEventListener() {}
    },
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); }
    },
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    window: {
      location: {
        href: file,
        replace(target) { locationState.replacedWith = target; }
      },
      addEventListener() {}
    }
  });

  return { accountInput, passwordInput, errorNode, submitButton, form, store, locationState };
}
```

Add at least these assertions:

```js
test('morning 登录页缺少账号时应提示并阻止提交', () => {
  const runtime = createRuntime('login-morning.html');
  runtime.passwordInput.value = 'secret';
  runtime.form.handler({ preventDefault() {} });
  assert.strictEqual(runtime.errorNode.textContent, '请输入账号');
});

test('morning 登录页提交成功后应写入 session、侧栏资料并跳转', () => {
  const runtime = createRuntime('login-morning.html');
  runtime.accountInput.value = 'ops-admin';
  runtime.passwordInput.value = 'secret';
  runtime.form.handler({ preventDefault() {} });
  assert.ok(runtime.store.cofeLoginSession);
  assert.ok(runtime.store.sidebarLoginProfile);
  assert.strictEqual(runtime.locationState.replacedWith, 'overview.html');
});
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run: `node --test tests/login-pages.runtime.test.js`

Expected: FAIL because `login-morning.html` does not yet expose the named runtime helpers or submit handling.

- [ ] **Step 3: Implement the morning-page runtime helpers**

```html
<script>
  const LOGIN_SESSION_KEY = 'cofeLoginSession';
  const SIDEBAR_LOGIN_PROFILE_KEY = 'sidebarLoginProfile';
  const LOGIN_SUCCESS_TARGET = 'overview.html';
  const LOGIN_BUTTON_IDLE_TEXT = '进入控制台';
  const LOGIN_BUTTON_LOADING_TEXT = '登录中...';
  const LOGIN_THEME = 'morning';

  const loginForm = document.getElementById('loginForm');
  const loginAccountInput = document.getElementById('loginAccount');
  const loginPasswordInput = document.getElementById('loginPassword');
  const loginErrorNode = document.getElementById('loginError');
  const loginSubmitButton = document.getElementById('loginSubmit');

  function renderLoginError(message) {
    loginErrorNode.textContent = message || '';
  }

  function setLoginSubmittingState(isSubmitting) {
    loginSubmitButton.disabled = isSubmitting;
    loginSubmitButton.textContent = isSubmitting ? LOGIN_BUTTON_LOADING_TEXT : LOGIN_BUTTON_IDLE_TEXT;
  }

  function validateLoginForm() {
    if (!loginAccountInput.value.trim()) return '请输入账号';
    if (!loginPasswordInput.value.trim()) return '请输入密码';
    return '';
  }

  function persistLoginSession(account) {
    localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({
      account,
      theme: LOGIN_THEME,
      loggedInAt: new Date().toISOString()
    }));
    localStorage.setItem(SIDEBAR_LOGIN_PROFILE_KEY, JSON.stringify({
      name: account,
      phone: account
    }));
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    const error = validateLoginForm();
    renderLoginError(error);
    if (error) return;
    setLoginSubmittingState(true);
    setTimeout(() => {
      const account = loginAccountInput.value.trim();
      persistLoginSession(account);
      window.location.replace(LOGIN_SUCCESS_TARGET);
    }, 800);
  }

  loginForm.addEventListener('submit', handleLoginSubmit);
</script>
```

Implementation notes:
- Leave the morning-page visual shell intact; only add the behavior required by the runtime test.
- Do not add remember-me or alternate auth paths while wiring the submit logic.

- [ ] **Step 4: Re-run the runtime test**

Run: `node --test tests/login-pages.runtime.test.js`

Expected: PASS for the morning-page validation and successful-submit assertions.

- [ ] **Step 5: Commit the first working login flow**

```bash
git add login-morning.html tests/login-pages.runtime.test.js
git commit -m "feat: add morning login runtime flow"
```

### Task 7: Extend The Runtime Coverage To Counter And Paper

**Files:**
- Modify: `/Users/mac/Documents/New project 4/tests/login-pages.runtime.test.js`
- Modify: `/Users/mac/Documents/New project 4/login-counter.html`
- Modify: `/Users/mac/Documents/New project 4/login-paper.html`

- [ ] **Step 1: Extend the runtime test to cover all three pages**

Refactor the test to loop over:

```js
const loginPages = [
  ['login-morning.html', 'morning'],
  ['login-counter.html', 'counter'],
  ['login-paper.html', 'paper']
];
```

Add assertions for each page:

```js
test(`${file} 缺少密码时应提示`, () => {
  const runtime = createRuntime(file);
  runtime.accountInput.value = 'ops-admin';
  runtime.form.handler({ preventDefault() {} });
  assert.strictEqual(runtime.errorNode.textContent, '请输入密码');
});

test(`${file} 成功提交后应记录主题并进入加载态`, () => {
  const runtime = createRuntime(file);
  runtime.accountInput.value = 'ops-admin';
  runtime.passwordInput.value = 'secret';
  runtime.form.handler({ preventDefault() {} });
  const session = JSON.parse(runtime.store.cofeLoginSession);
  assert.strictEqual(session.theme, expectedTheme);
  assert.strictEqual(runtime.submitButton.disabled, true);
  assert.strictEqual(runtime.submitButton.textContent, '登录中...');
  assert.strictEqual(runtime.locationState.replacedWith, 'overview.html');
});
```

- [ ] **Step 2: Run the runtime test to verify it fails on the missing pages**

Run: `node --test tests/login-pages.runtime.test.js`

Expected: FAIL because `login-counter.html` and `login-paper.html` do not yet implement the named runtime helpers and submit binding.

- [ ] **Step 3: Port the shared runtime flow to the counter and paper pages**

Reuse the same helper names and DOM ids from `login-morning.html`, changing only:

```js
const LOGIN_THEME = 'counter';
```

and

```js
const LOGIN_THEME = 'paper';
```

Implementation notes:
- Keep the runtime code behavior identical so the only conceptual difference remains the visual treatment.
- Preserve the shared submit-button copy and redirect target.
- Ensure the script still ends with `loginForm.addEventListener('submit', handleLoginSubmit);`.

- [ ] **Step 4: Re-run the runtime test**

Run: `node --test tests/login-pages.runtime.test.js`

Expected: PASS for morning, counter, and paper validation + persistence scenarios.

- [ ] **Step 5: Commit the remaining login flows**

```bash
git add login-counter.html login-paper.html tests/login-pages.runtime.test.js
git commit -m "feat: add shared runtime flow to login concepts"
```

### Task 8: Run The Full Login Regression Set

**Files:**
- Verify only: `/Users/mac/Documents/New project 4/index.html`
- Verify only: `/Users/mac/Documents/New project 4/login-gallery.html`
- Verify only: `/Users/mac/Documents/New project 4/login-morning.html`
- Verify only: `/Users/mac/Documents/New project 4/login-counter.html`
- Verify only: `/Users/mac/Documents/New project 4/login-paper.html`
- Verify only: `/Users/mac/Documents/New project 4/tests/login-gallery.entry.test.js`
- Verify only: `/Users/mac/Documents/New project 4/tests/login-pages.structure.test.js`
- Verify only: `/Users/mac/Documents/New project 4/tests/login-pages.runtime.test.js`
- Verify only: `/Users/mac/Documents/New project 4/tests/pages.font-stack.test.js`
- Verify only: `/Users/mac/Documents/New project 4/tests/sidebar.shared-login.test.js`
- Verify only: `/Users/mac/Documents/New project 4/tests/overview.sidebar-login.test.js`

- [ ] **Step 1: Run the targeted login regression suite**

Run:

```bash
node --test \
  tests/login-gallery.entry.test.js \
  tests/login-pages.structure.test.js \
  tests/login-pages.runtime.test.js \
  tests/pages.font-stack.test.js \
  tests/sidebar.shared-login.test.js \
  tests/overview.sidebar-login.test.js
```

Expected: PASS for all tests with no new sidebar-login regressions.

- [ ] **Step 2: Do a browser smoke check of all four entry pages**

Run:

```bash
open /Users/mac/Documents/New\ project\ 4/login-gallery.html
open /Users/mac/Documents/New\ project\ 4/login-morning.html
open /Users/mac/Documents/New\ project\ 4/login-counter.html
open /Users/mac/Documents/New\ project\ 4/login-paper.html
```

Expected:
- desktop layouts feel visually distinct
- mobile simulator or responsive mode shows intentional stacked layouts
- submitting any concept page lands in `overview.html`

- [ ] **Step 3: Commit any final polish required by verification**

```bash
git add index.html login-gallery.html login-morning.html login-counter.html login-paper.html \
  tests/login-gallery.entry.test.js tests/login-pages.structure.test.js tests/login-pages.runtime.test.js \
  tests/pages.font-stack.test.js
git commit -m "feat: add cofeplus login gallery concepts"
```

- [ ] **Step 4: Hand off to branch-finishing workflow**

After implementation is complete and verified, use `superpowers:finishing-a-development-branch`.
