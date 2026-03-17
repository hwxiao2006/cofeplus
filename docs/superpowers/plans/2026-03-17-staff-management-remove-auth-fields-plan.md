# Staff Management Remove Auth Fields Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all authorization and `openId` fields from the staff add/edit form while keeping the rest of the staff-management page behavior unchanged.

**Architecture:** Keep the change self-contained inside `staff-management.html` and `tests/staff-management.behavior.test.js`. First update the behavior test to assert the authorization and `openId` fields are gone, then remove the related form markup and any now-dead JavaScript that resets, fills, mocks, or saves those fields. Historical staff objects may still contain old auth properties, but the page should simply ignore them.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node-based behavior tests

---

## Chunk 1: Remove Auth Fields And Their Form Logic

### Task 1: Lock the auth-field removal with a failing behavior test

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Rewrite the existing form-field test to expect auth fields to be absent**

Update the existing `人员管理页：添加人员表单应覆盖截图中的关键字段分组` test so it still asserts the remaining required form content:

```js
assert.ok(staffHtml.includes('基本信息<span class="required">*</span>'));
assert.ok(staffHtml.includes('用户名'));
assert.ok(staffHtml.includes('手机号'));
assert.ok(staffHtml.includes('菜单权限配置<span class="required">*</span>'));
assert.ok(staffHtml.includes('公众号推送'));
assert.ok(staffHtml.includes('负责设备号<span class="required">*</span>'));
```

and now explicitly rejects the removed auth/openId content:

```js
assert.ok(!staffHtml.includes('运维小程序授权'));
assert.ok(!staffHtml.includes('微信公众号推送授权'));
assert.ok(!staffHtml.includes('openId'));
```

Add one more assertion in the same file to ensure the legacy auth helper is gone:

```js
assert.ok(!/function\s+mockAuthorize\s*\(/.test(staffHtml));
```

- [ ] **Step 2: Run the staff behavior test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`

Expected: FAIL because the page still contains `运维小程序授权`, `微信公众号推送授权`, `openId`, and `mockAuthorize`.

- [ ] **Step 3: Remove auth/openId form markup from the staff modal**

In `staff-management.html`, delete these form rows from the `基本信息` section:

```html
<div class="form-item form-col-full">
  <label class="form-label" for="opsAuthHint">运维小程序授权</label>
  ...
</div>
<div class="form-item form-col-full">
  <label class="form-label" for="opsOpenid">openId</label>
  ...
</div>
<div class="form-item form-col-full">
  <label class="form-label" for="wechatAuthHint">微信公众号推送授权</label>
  ...
</div>
<div class="form-item form-col-full">
  <label class="form-label" for="wechatOpenid">openId</label>
  ...
</div>
```

Do not leave empty wrappers or unused spacing helpers behind.

- [ ] **Step 4: Remove the related JavaScript form logic**

In `staff-management.html`, remove the dead code paths tied to the deleted fields:

- In `resetStaffForm()`, delete:

```js
document.getElementById('opsOpenid').value = '';
document.getElementById('wechatOpenid').value = '';
```

- In `fillStaffForm(targetStaff)`, delete:

```js
document.getElementById('opsOpenid').value = targetStaff.opsOpenid || '';
document.getElementById('wechatOpenid').value = targetStaff.wechatOpenid || '';
```

- Delete the entire helper:

```js
function mockAuthorize(type) {
  ...
}
```

- In the save handler, remove:

```js
const opsOpenid = document.getElementById('opsOpenid').value.trim();
const wechatOpenid = document.getElementById('wechatOpenid').value.trim();
```

and remove these properties from the saved staff object:

```js
opsOpenid,
wechatOpenid,
```

Leave all other form fields, permission logic, and push-channel logic untouched.

- [ ] **Step 5: Re-run the staff behavior test to verify the simplified form passes**

Run: `node tests/staff-management.behavior.test.js`

Expected: all staff-management behavior tests pass, including the updated “add/edit form fields” assertions.

- [ ] **Step 6: Commit the auth-field removal**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: remove staff auth form fields"
```

### Task 2: Run final regression verification for adjacent behavior

**Files:**
- Verify: `staff-management.html`
- Verify: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Re-run the targeted staff regression suite**

Run: `node tests/staff-management.behavior.test.js`

Expected: every check prints `PASS ...` and the command exits with code `0`.

- [ ] **Step 2: Re-run the adjacent device-search regression**

Run: `node tests/device-search.location-name.test.js`

Expected: both tests pass, confirming the staff page still supports device-number and location-name filtering after the form cleanup.

- [ ] **Step 3: Manually verify the staff modal**

Open `staff-management.html` and confirm:

- the modal still opens
- `用户名` and `手机号` remain
- no authorization rows appear
- no `openId` fields appear
- save/edit flows still work without runtime errors

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "test: verify staff auth field removal"
```
