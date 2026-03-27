# Staff Login Merchant Source Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make staff management always use the logged-in user's merchant, removing merchant switching and any URL or local cache override path.

**Architecture:** Persist `merchantId` and `merchantName` into the shared sidebar login profile during login, then have `staff-management.html` read that profile as its sole merchant source. Keep the existing staff/device data structures, but stop deriving page merchant context from query parameters, `currentMerchantId`, or edited staff records.

**Tech Stack:** Static HTML pages, inline browser JavaScript, Node-based regex behavior tests

---

## Chunk 1: Tests First

### Task 1: Lock login persistence to include merchant info

**Files:**
- Modify: `tests/sidebar.shared-login.test.js`
- Create: `tests/login-paper.profile-merchant.test.js`
- Test: `tests/login-paper.profile-merchant.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('纸感登录页应把所属商户写入 sidebarLoginProfile', () => {
  assert.ok(/merchantId:\s*SIDEBAR_LOGIN_MERCHANT_ID/.test(html));
  assert.ok(/merchantName:\s*SIDEBAR_LOGIN_MERCHANT_NAME/.test(html));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/login-paper.profile-merchant.test.js`
Expected: FAIL because `login-paper.html` only persists `name` and `phone`

- [ ] **Step 3: Write minimal implementation**

```js
const SIDEBAR_LOGIN_MERCHANT_ID = 'C001';
const SIDEBAR_LOGIN_MERCHANT_NAME = '星巴克咖啡';

localStorage.setItem(SIDEBAR_LOGIN_PROFILE_KEY, JSON.stringify({
  name: SIDEBAR_LOGIN_DISPLAY_NAME,
  phone: SIDEBAR_LOGIN_DISPLAY_PHONE,
  merchantId: SIDEBAR_LOGIN_MERCHANT_ID,
  merchantName: SIDEBAR_LOGIN_MERCHANT_NAME
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/login-paper.profile-merchant.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add login-paper.html tests/login-paper.profile-merchant.test.js tests/sidebar.shared-login.test.js
git commit -m "test: persist merchant info in login profile"
```

### Task 2: Lock staff page merchant source to login profile only

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('人员管理页应仅使用登录态商户信息', () => {
  assert.ok(/function\s+getCurrentMerchantContext\(\)/.test(staffHtml));
  assert.ok(!/function\s+resolveInitialMerchantId\s*\(/.test(staffHtml));
  assert.ok(!/currentMerchantId/.test(staffHtml));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL because the page still reads URL parameters and `localStorage.currentMerchantId`

- [ ] **Step 3: Write minimal implementation**

```js
function getCurrentMerchantContext() {
  const profile = getSidebarLoginProfile();
  return {
    merchantId: String(profile.merchantId || ''),
    merchantName: String(profile.merchantName || '')
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: source staff merchant from login profile"
```

## Chunk 2: Green and Verify

### Task 3: Wire the staff page to the login merchant context

**Files:**
- Modify: `staff-management.html`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Keep only login-based merchant selection**

```js
const currentMerchantContext = getCurrentMerchantContext();
selectedMerchantId = currentMerchantContext.merchantId;
```

- [ ] **Step 2: Use login merchant name for title and save payload**

```js
listTitle.textContent = `${currentMerchantContext.merchantName || '未获取登录商户'} · 管理人员列表`;
```

- [ ] **Step 3: Prevent modal/device flows when login merchant is missing**

```js
if (!selectedMerchantId) {
  showToast('未获取登录商户信息');
  return;
}
```

- [ ] **Step 4: Stop edit flow from mutating page merchant context**

```js
renderDevicePicker(selectedMerchantId, targetStaff.devices || []);
```

- [ ] **Step 5: Commit**

```bash
git add staff-management.html
git commit -m "refactor: remove staff merchant switching"
```

### Task 4: Verify targeted behavior

**Files:**
- Test: `tests/login-paper.profile-merchant.test.js`
- Test: `tests/sidebar.shared-login.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Run targeted tests**

Run: `node tests/login-paper.profile-merchant.test.js && node tests/sidebar.shared-login.test.js && node tests/staff-management.behavior.test.js`
Expected: PASS for all three files

- [ ] **Step 2: Check diff before handoff**

Run: `git diff -- login-paper.html staff-management.html tests/login-paper.profile-merchant.test.js tests/sidebar.shared-login.test.js tests/staff-management.behavior.test.js`
Expected: Only approved merchant-source changes appear

- [ ] **Step 3: Share verification output**

Report the exact commands run, whether they passed, and any residual risk if other pages still rely on default profile data.
