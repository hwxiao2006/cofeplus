# Login Default Staff Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the login page's default account identity with the default enabled staff member shown in staff management.

**Architecture:** Keep the existing static-page structure and change only `login-paper.html`. Add tests that compare the login page's default account field and persisted display identity against the staff-management default manager data, so future edits cannot drift the two pages apart silently.

**Tech Stack:** Static HTML, inline JavaScript, Node-based regex tests

---

## Chunk 1: Test First

### Task 1: Lock login defaults to the staff-management default person

**Files:**
- Modify: `tests/login-paper.profile-merchant.test.js`
- Test: `tests/login-paper.profile-merchant.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('纸感登录页默认账号应与人员管理默认启用人员一致', () => {
  assert.strictEqual(loginDefaultPhone, staffDefaultPhone);
  assert.strictEqual(loginDisplayName, staffDefaultName);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/login-paper.profile-merchant.test.js`
Expected: FAIL because `login-paper.html` still uses `运营管理员 / 13800138000`

- [ ] **Step 3: Write minimal implementation**

```js
const SIDEBAR_LOGIN_DISPLAY_NAME = '王运维';
const SIDEBAR_LOGIN_DISPLAY_PHONE = '13800138021';
<input id="loginAccount" value="13800138021">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/login-paper.profile-merchant.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add login-paper.html tests/login-paper.profile-merchant.test.js docs/superpowers/plans/2026-03-18-login-default-staff-alignment-plan.md
git commit -m "fix: align login defaults with staff manager"
```

## Chunk 2: Verification

### Task 2: Re-run related login/sidebar checks

**Files:**
- Test: `tests/login-paper.profile-merchant.test.js`
- Test: `tests/sidebar.shared-login.test.js`
- Test: `tests/overview.sidebar-login.test.js`

- [ ] **Step 1: Run targeted verification**

Run: `node tests/login-paper.profile-merchant.test.js && node tests/sidebar.shared-login.test.js && node tests/overview.sidebar-login.test.js`
Expected: PASS

- [ ] **Step 2: Inspect final diff**

Run: `git diff -- login-paper.html tests/login-paper.profile-merchant.test.js docs/superpowers/plans/2026-03-18-login-default-staff-alignment-plan.md`
Expected: Only login default alignment changes appear
