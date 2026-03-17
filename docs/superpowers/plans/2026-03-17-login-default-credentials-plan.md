# Login Default Credentials Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-fill the remaining paper login page with demo credentials and persist the sidebar profile in the existing admin display format after login.

**Architecture:** Keep the current single-file paper login page and shared inline-script pattern. Add test coverage first for static default values and runtime persistence, then make minimal HTML and script changes in the remaining login page.

**Tech Stack:** Static HTML, inline CSS, inline vanilla JavaScript, Node.js built-in test runner, regex-based HTML assertions, `vm`-based runtime tests.

---

## File Structure

- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.structure.test.js`
  Responsibility: verify `login-paper.html` exposes the approved default account and password values.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.runtime.test.js`
  Responsibility: verify successful paper login writes the session account and the stable sidebar profile separately.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-paper.html`
  Responsibility: add the approved default credentials and stable sidebar-profile persistence.

## Chunk 1: Test The New Login Defaults

### Task 1: Add Failing Structure And Runtime Tests

**Files:**
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.structure.test.js`
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.runtime.test.js`

- [ ] **Step 1: Write the failing structure assertions**

Verify the remaining login page contains:

- `value="13800138000"` on the account input
- `value="123456"` on the password input

- [ ] **Step 2: Write the failing runtime assertions**

Verify a successful login:

- stores the submitted account in `cofeLoginSession.account`
- stores `运营管理员 / 13800138000` in `sidebarLoginProfile`

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
node --test tests/login-pages.structure.test.js tests/login-pages.runtime.test.js
```

Expected: FAIL because the HTML has no default values and the runtime still mirrors the account into both sidebar fields.

## Chunk 2: Minimal Login Page Updates

### Task 2: Update The Remaining Login Page

**Files:**
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-paper.html`

- [ ] **Step 1: Add the default credentials to both inputs**

- [ ] **Step 2: Persist the stable sidebar profile separately from the submitted session account**

- [ ] **Step 3: Re-run the targeted tests**

Run:

```bash
node --test tests/login-pages.structure.test.js tests/login-pages.runtime.test.js
```

Expected: PASS

- [ ] **Step 4: Re-run the broader login regression checks**

Run:

```bash
node --test tests/login-paper.headline.test.js tests/pages.font-stack.test.js
```

Expected: PASS
